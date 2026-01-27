DO $$ BEGIN
    CREATE TYPE public.currency_type AS ENUM ('lumo_coin', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.point_transactions 
ADD COLUMN IF NOT EXISTS transaction_type public.currency_type DEFAULT 'credit';

UPDATE public.point_transactions
SET transaction_type = 'lumo_coin'
WHERE reason IN ('book_opened', 'book_completed', 'mission_completed', 'word_insight_viewed', 'word_added', 'magic_sentence_generated', 'story_generated');

-- Add index for efficient filtering of achievements
CREATE INDEX IF NOT EXISTS point_transactions_child_type_created_idx 
ON public.point_transactions (child_id, transaction_type, created_at DESC);

-- Update claim_lumo_reward to set transaction_type to 'lumo_coin'
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
  v_owner_id UUID;
  v_today DATE;
  v_yesterday DATE;
  v_last_active_date DATE;
  v_inserted_id UUID;
  v_result JSONB;
BEGIN
  SELECT last_activity_at, streak_count, COALESCE(total_xp, 0), owner_user_id
  INTO v_last_activity, v_streak_count, v_current_total_xp, v_owner_id
  FROM public.children
  WHERE id = v_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child not found');
  END IF;

  INSERT INTO public.point_transactions (
    child_id,
    owner_user_id,
    identity_key,
    amount,
    reason,
    idempotency_key,
    entity_type,
    entity_id,
    metadata,
    transaction_type -- Explicitly set type
  ) VALUES (
    v_child_id,
    v_owner_id,
    v_owner_id::text,
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
    p_metadata,
    'lumo_coin' -- Earned rewards are always Lumo Coins
  )
  ON CONFLICT (child_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_inserted_id;

  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
  v_yesterday := v_today - INTERVAL '1 day';
  v_last_active_date := (v_last_activity AT TIME ZONE p_timezone)::DATE;

  IF v_last_activity IS NULL THEN
    v_streak_count := 1;
  ELSIF v_last_active_date = v_today THEN
    -- Already active
  ELSIF v_last_active_date = v_yesterday THEN
    v_streak_count := v_streak_count + 1;
  ELSE
    v_streak_count := 1;
  END IF;

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

  IF (p_reason = 'book_completed' OR p_reason = 'mission_completed') AND p_entity_id IS NOT NULL THEN
    INSERT INTO public.child_books (child_id, book_id, is_completed, last_read_at)
    VALUES (v_child_id, p_entity_id::uuid, true, NOW())
    ON CONFLICT (child_id, book_id) DO UPDATE 
    SET is_completed = true, last_read_at = EXCLUDED.last_read_at;
  END IF;

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

  PERFORM public.evaluate_child_badges(v_child_id, p_timezone);

  RETURN v_result;
END;
$$;
