-- Migration: Fix Ambiguous Usage RPC
-- Fixes the "column reference 'success' is ambiguous" error in increment_feature_usage

BEGIN;

CREATE OR REPLACE FUNCTION public.increment_feature_usage(
    p_identity_key TEXT,
    p_feature_name TEXT,
    p_max_limit INTEGER,
    p_owner_user_id UUID DEFAULT NULL,
    p_increment INTEGER DEFAULT 1
)
RETURNS TABLE (
    success BOOLEAN,
    current_count INTEGER,
    enforced_limit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_success BOOLEAN;
    v_error TEXT;
    v_current INTEGER;
BEGIN
    -- Explicitly alias the return columns of the batch function to avoid name collisions
    -- with the return columns of the wrapper function.
    SELECT r.success, r.error_message INTO v_success, v_error
    FROM public.increment_batch_feature_usage(
        p_identity_key,
        jsonb_build_array(
            jsonb_build_object(
                'feature_name', p_feature_name,
                'increment', p_increment,
                'max_limit', p_max_limit
            )
        ),
        p_owner_user_id
    ) AS r;

    -- Get new state to return expected format
    SELECT current_usage INTO v_current
    FROM public.feature_usage
    WHERE identity_key = p_identity_key AND feature_name = p_feature_name;

    -- Return explicitly using variable names
    RETURN QUERY SELECT v_success, COALESCE(v_current, 0), p_max_limit;
END;
$$;

COMMIT;
