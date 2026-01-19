-- Update record_activity to also log into point_transactions
CREATE OR REPLACE FUNCTION public.record_activity(
  p_child_id uuid,
  p_action_type text,
  p_entity_type text,
  p_entity_id text,
  p_details jsonb DEFAULT '{}'::jsonb,
  p_xp_reward integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity TIMESTAMPTZ;
  v_streak_count INTEGER;
  v_max_streak INTEGER;
  v_current_date DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
  v_last_date DATE;
  v_duplicate_count INTEGER;
  v_child_owner_id UUID;
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_result JSONB;
BEGIN
  -- 1. Get child and owner info
  SELECT owner_user_id, last_activity_at, streak_count, max_streak 
  INTO v_child_owner_id, v_last_activity, v_streak_count, v_max_streak
  FROM public.children
  WHERE id = p_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child not found in children table');
  END IF;

  -- Verify owner (Security check)
  IF v_child_owner_id != auth.uid() AND auth.role() != 'service_role' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Owner mismatch');
  END IF;

  -- 2. Deduping logic for awards
  IF p_action_type = 'book.completed' THEN
    SELECT COUNT(*) INTO v_duplicate_count
    FROM public.audit_logs
    WHERE child_id = p_child_id
      AND action_type = 'book.completed'
      AND entity_id = p_entity_id;
  ELSE
    SELECT COUNT(*) INTO v_duplicate_count
    FROM public.audit_logs
    WHERE child_id = p_child_id
      AND action_type::text = p_action_type
      AND entity_id = p_entity_id
      AND created_at::DATE = v_current_date;
  END IF;

  -- 3. Award points if not a duplicate
  IF v_duplicate_count = 0 THEN
    -- A. Insert into audit_logs
    INSERT INTO public.audit_logs (
      owner_user_id,
      identity_key,
      child_id,
      action_type,
      entity_type,
      entity_id,
      details,
      status
    ) VALUES (
      v_child_owner_id,
      v_child_owner_id::text,
      p_child_id,
      p_action_type::public.audit_action_type,
      p_entity_type::public.audit_entity_type,
      p_entity_id,
      p_details,
      'success'
    );

    -- B. Insert into point_transactions (XP history)
    INSERT INTO public.point_transactions (
      owner_user_id,
      identity_key,
      child_id,
      amount,
      reason,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      v_child_owner_id,
      v_child_owner_id::text,
      p_child_id,
      p_xp_reward,
      p_action_type,
      p_entity_type,
      p_entity_id,
      p_details
    );

    -- Calculate Streaks
    IF v_last_activity IS NULL THEN
      v_streak_count := 1;
    ELSE
      v_last_date := (v_last_activity AT TIME ZONE 'UTC')::DATE;
      
      IF v_last_date = v_current_date THEN
        -- Already active today, streak remains the same
      ELSIF v_last_date = (v_current_date - INTERVAL '1 day')::DATE THEN
        -- Consecutive day
        v_streak_count := v_streak_count + 1;
      ELSE
        -- Broke streak
        v_streak_count := 1;
      END IF;
    END IF;

    IF v_streak_count > v_max_streak THEN
      v_max_streak := v_streak_count;
    END IF;

    -- Update child stats (XP, Level, Streak)
    UPDATE public.children
    SET 
      total_xp = COALESCE(total_xp, 0) + p_xp_reward,
      level = floor((COALESCE(total_xp, 0) + p_xp_reward) / 1000) + 1,
      streak_count = v_streak_count,
      max_streak = v_max_streak,
      last_activity_at = NOW(),
      updated_at = NOW()
    WHERE id = p_child_id
    RETURNING total_xp, level INTO v_new_xp, v_new_level;

    v_result := jsonb_build_object(
      'success', true,
      'xp_earned', p_xp_reward,
      'total_xp', v_new_xp,
      'level', v_new_level,
      'streak_count', v_streak_count,
      'max_streak', v_max_streak,
      'is_new_activity', true
    );
  ELSE
    v_result := jsonb_build_object(
      'success', true,
      'is_new_activity', false,
      'message', 'Activity already recorded and deduped'
    );
  END IF;

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
