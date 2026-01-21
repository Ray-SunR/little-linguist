-- Migration: Deterministic Rewards and Streaks
-- Description: Creates a lean, idempotent RPC for awarding Lumo Coins and managing streaks.

-- Drop old function to avoid signature conflicts
DROP FUNCTION IF EXISTS public.claim_lumo_reward(uuid, text, integer, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.claim_lumo_reward(text, text, integer, text, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.claim_lumo_reward(
  p_child_id text,
  p_key text,
  p_amount integer,
  p_reason text,
  p_entity_id text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id UUID := p_child_id::UUID;
  v_last_activity TIMESTAMPTZ;
  v_streak_count INTEGER;
  v_current_total_xp INTEGER;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
  v_today DATE;
  v_yesterday DATE;
  v_last_active_date DATE;
  v_inserted_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Attempt to record the transaction (Idempotency Check)
  INSERT INTO public.point_transactions (
    child_id,
    amount,
    reason,
    idempotency_key,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_child_id,
    p_amount,
    p_reason,
    p_key,
    CASE 
      WHEN p_reason LIKE 'book%' OR p_reason LIKE 'mission%' THEN 'book'
      WHEN p_reason LIKE 'story%' OR p_reason LIKE 'magic%' THEN 'story'
      WHEN p_reason LIKE 'word%' THEN 'word'
      ELSE 'other'
    END,
    p_entity_id,
    p_metadata
  )
  ON CONFLICT (child_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- 2. Fetch current stats
  SELECT last_activity_at, streak_count, COALESCE(total_xp, 0)
  INTO v_last_activity, v_streak_count, v_current_total_xp
  FROM public.children
  WHERE id = v_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child not found');
  END IF;

  -- 3. Calculate streak and update stats only if it's a new reward OR a new day for engagement
  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
  v_yesterday := v_today - INTERVAL '1 day';
  v_last_active_date := (v_last_activity AT TIME ZONE p_timezone)::DATE;

  IF v_last_activity IS NULL THEN
    v_streak_count := 1;
  ELSIF v_last_active_date = v_today THEN
    -- Already active today, streak stays same
  ELSIF v_last_active_date = v_yesterday THEN
    -- Consecutive day, increment streak
    v_streak_count := v_streak_count + 1;
  ELSE
    -- Streak broken, reset to 1
    v_streak_count := 1;
  END IF;

  -- 4. Apply Updates
  v_new_total_xp := v_current_total_xp + COALESCE(CASE WHEN v_inserted_id IS NOT NULL THEN p_amount ELSE 0 END, 0);
  v_new_level := floor(v_new_total_xp / 1000) + 1;

  UPDATE public.children
  SET 
    total_xp = v_new_total_xp,
    level = v_new_level,
    streak_count = v_streak_count,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = v_child_id;

  -- 5. Atomic Completion Support (For mission/book rewards)
  IF (p_reason = 'book_completed' OR p_reason = 'mission_completed') AND p_entity_id IS NOT NULL THEN
    INSERT INTO public.child_books (child_id, book_id, is_completed, last_read_at)
    VALUES (v_child_id, p_entity_id::uuid, true, NOW())
    ON CONFLICT (child_id, book_id) DO UPDATE 
    SET is_completed = true, last_read_at = EXCLUDED.last_read_at;
  END IF;

  -- 6. Audit Log
  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      owner_user_id,
      identity_key,
      child_id,
      action_type,
      entity_type,
      entity_id,
      details,
      status
    ) 
    SELECT 
      owner_user_id,
      owner_user_id::text,
      v_child_id,
      CASE 
        WHEN p_reason = 'book_opened' THEN 'book.opened'::public.audit_action_type
        WHEN p_reason = 'book_completed' THEN 'book.completed'::public.audit_action_type
        WHEN p_reason = 'mission_completed' THEN 'book.completed'::public.audit_action_type
        WHEN p_reason = 'story_generated' THEN 'story.generated'::public.audit_action_type
        WHEN p_reason = 'magic_sentence_generated' THEN 'story.generated'::public.audit_action_type
        WHEN p_reason = 'word_insight_viewed' THEN 'word_insight.viewed'::public.audit_action_type
        WHEN p_reason = 'word_added' THEN 'word.added'::public.audit_action_type
        ELSE 'user.login'::public.audit_action_type
      END,
      CASE 
        WHEN p_reason LIKE 'book%' OR p_reason LIKE 'mission%' THEN 'book'::public.audit_entity_type
        WHEN p_reason LIKE 'story%' OR p_reason LIKE 'magic%' THEN 'story'::public.audit_entity_type
        WHEN p_reason LIKE 'word%' THEN 'word'::public.audit_entity_type
        ELSE 'child_profile'::public.audit_entity_type
      END,
      p_entity_id,
      p_metadata,
      'success'
    FROM public.children WHERE id = v_child_id;
  END IF;

  v_result := jsonb_build_object(
    'success', v_inserted_id IS NOT NULL,
    'xp_earned', CASE WHEN v_inserted_id IS NOT NULL THEN p_amount ELSE 0 END,
    'new_total_xp', v_new_total_xp,
    'new_level', v_new_level,
    'new_streak', v_streak_count,
    'is_new_day', v_last_active_date IS NULL OR v_last_active_date < v_today
  );

  -- 7. Trigger Badge Evaluation
  PERFORM public.evaluate_child_badges(v_child_id, p_timezone);

  RETURN v_result;
END;
$$;

  v_result := jsonb_build_object(
    'success', v_inserted_id IS NOT NULL,
    'xp_earned', CASE WHEN v_inserted_id IS NOT NULL THEN p_amount ELSE 0 END,
    'new_total_xp', v_new_total_xp,
    'new_level', v_new_level,
    'new_streak', v_streak_count,
    'is_new_day', v_last_active_date IS NULL OR v_last_active_date < v_today
  );

  -- 7. Trigger Badge Evaluation
  PERFORM public.evaluate_child_badges(p_child_id, p_timezone);

  RETURN v_result;
END;
$$;

-- Badge Evaluation Logic
DROP FUNCTION IF EXISTS public.evaluate_child_badges(uuid, text);

CREATE OR REPLACE FUNCTION public.evaluate_child_badges(
  p_child_id uuid,
  p_timezone text DEFAULT 'UTC'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_count INTEGER;
  v_total_xp INTEGER;
  v_earned_badges JSONB;
  v_new_badges JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_hour INTEGER;
BEGIN
  SELECT streak_count, total_xp, COALESCE(earned_badges, '{}'::jsonb)
  INTO v_streak_count, v_total_xp, v_earned_badges
  FROM public.children
  WHERE id = p_child_id;

  v_new_badges := v_earned_badges;
  v_hour := EXTRACT(HOUR FROM v_now AT TIME ZONE p_timezone);

  -- 1. Streak Hero (7 days)
  IF v_streak_count >= 7 AND NOT (v_new_badges ? 'streak_hero') THEN
    v_new_badges := v_new_badges || jsonb_build_object('streak_hero', v_now);
  END IF;

  -- 2. Reading Ace (First book)
  IF NOT (v_new_badges ? 'reading_ace') AND EXISTS (
    SELECT 1 FROM public.point_transactions 
    WHERE child_id = p_child_id AND reason IN ('book_completed', 'mission_completed')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('reading_ace', v_now);
  END IF;

  -- 3. Creation Wizard (5 stories)
  IF NOT (v_new_badges ? 'creation_wizard') AND (
    SELECT count(*) FROM public.point_transactions 
    WHERE child_id = p_child_id AND reason = 'story_generated'
  ) >= 5 THEN
    v_new_badges := v_new_badges || jsonb_build_object('creation_wizard', v_now);
  END IF;

  -- 4. Word Master (50 words learning - adjusting to 'any word added' for simplicity for now, or check status)
  IF NOT (v_new_badges ? 'word_master') AND (
    SELECT count(*) FROM public.child_vocab WHERE child_id = p_child_id
  ) >= 50 THEN
    v_new_badges := v_new_badges || jsonb_build_object('word_master', v_now);
  END IF;

  -- 5. Night Owl (After 8 PM)
  IF NOT (v_new_badges ? 'night_owl') AND v_hour >= 20 AND EXISTS (
     SELECT 1 FROM public.point_transactions 
     WHERE child_id = p_child_id AND created_at >= (v_now - INTERVAL '5 minutes')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('night_owl', v_now);
  END IF;

  -- 6. Early Bird (Before 8 AM)
  IF NOT (v_new_badges ? 'early_bird') AND v_hour < 8 AND EXISTS (
     SELECT 1 FROM public.point_transactions 
     WHERE child_id = p_child_id AND created_at >= (v_now - INTERVAL '5 minutes')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('early_bird', v_now);
  END IF;

  -- Update if changed
  IF v_new_badges != v_earned_badges THEN
    UPDATE public.children
    SET earned_badges = v_new_badges
    WHERE id = p_child_id;
  END IF;
END;
$$;
