-- Migration: Atomic Usage Increment RPC
-- Prevents race conditions and ensures limit integrity

CREATE OR REPLACE FUNCTION public.increment_feature_usage(
    p_identity_key TEXT,
    p_feature_name TEXT,
    p_max_limit INTEGER,
    p_user_id UUID DEFAULT NULL,
    p_guest_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    current_count INTEGER,
    enforced_limit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with permission of creator (admin) to bypass RLS if needed
SET search_path = public
AS $$
DECLARE
    v_current INTEGER;
    v_limit INTEGER;
BEGIN
    -- 1. Try to get existing usage in a locking way
    SELECT current_usage, max_limit 
    INTO v_current, v_limit
    FROM public.feature_usage
    WHERE identity_key = p_identity_key AND feature_name = p_feature_name
    FOR UPDATE; -- Lock the row for this transaction

    -- 2. If row exists, check limit and increment
    IF FOUND THEN
        IF v_current >= v_limit THEN
            RETURN QUERY SELECT FALSE, v_current, v_limit;
            RETURN;
        END IF;

        UPDATE public.feature_usage
        SET current_usage = current_usage + 1,
            updated_at = now()
        WHERE identity_key = p_identity_key AND feature_name = p_feature_name
        RETURNING current_usage, max_limit INTO v_current, v_limit;

        RETURN QUERY SELECT TRUE, v_current, v_limit;
    ELSE
        -- 3. If row doesn't exist, create it
        -- We trust p_max_limit only on creation or if we want to allow the server to "upsert" a new limit
        INSERT INTO public.feature_usage (
            user_id, 
            guest_id, 
            identity_key, 
            feature_name, 
            current_usage, 
            max_limit
        ) VALUES (
            p_user_id,
            p_guest_id,
            p_identity_key,
            p_feature_name,
            1,
            p_max_limit
        )
        RETURNING current_usage, max_limit INTO v_current, v_limit;

        RETURN QUERY SELECT TRUE, v_current, v_limit;
    END IF;
END;
$$;
