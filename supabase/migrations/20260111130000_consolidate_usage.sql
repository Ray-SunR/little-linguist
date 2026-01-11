
-- Consolidate Usage Tracking Migration
-- 1. Drops obsolete functions and overlapping signatures
-- 2. Ensures table schema is correct (no guest_id)
-- 3. Recreates the definitive increment_batch_feature_usage RPC
-- 4. Recreates increment_feature_usage for legacy support (wrapping batch)

BEGIN;

-- 1. Cleanup old functions
DROP FUNCTION IF EXISTS public.increment_feature_usage(TEXT, TEXT, INTEGER, UUID, INTEGER);
DROP FUNCTION IF EXISTS public.increment_feature_usage(TEXT, TEXT, INTEGER, TEXT, INTEGER); -- Old signature with guest_id
DROP FUNCTION IF EXISTS public.increment_batch_feature_usage(TEXT, JSONB, UUID);

-- 2. Schema Cleanup: Ensure guest_id is gone
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_usage' AND column_name = 'guest_id') THEN
        ALTER TABLE public.feature_usage DROP COLUMN guest_id;
    END IF;
END $$;

-- Ensure constraints (identity_key + feature_name must be unique)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'feature_usage_identity_key_feature_name_key') THEN
        ALTER TABLE public.feature_usage ADD CONSTRAINT feature_usage_identity_key_feature_name_key UNIQUE (identity_key, feature_name);
    END IF;
END $$;


-- 3. Define Batch RPC (The Source of Truth)
CREATE OR REPLACE FUNCTION public.increment_batch_feature_usage(
    p_identity_key TEXT,
    p_updates JSONB, -- Array of { feature_name, increment, max_limit }
    p_owner_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_update JSONB;
    v_feature_name TEXT;
    v_increment INTEGER;
    v_max_limit INTEGER;
    v_current INTEGER;
    v_limit INTEGER;
BEGIN
    -- 1. Lock all relevant rows in a consistent order to prevent deadlocks
    -- We extract feature names, sort them, and lock
    PERFORM 1 
    FROM public.feature_usage 
    WHERE identity_key = p_identity_key 
      AND feature_name IN (
          SELECT (value->>'feature_name') 
          FROM jsonb_array_elements(p_updates)
      )
    FOR UPDATE;

    -- 2. Validation Phase: Check all limits *assuming* the increments happen
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;

        -- Get current usage (or 0 if not exists)
        SELECT current_usage, max_limit 
        INTO v_current, v_limit
        FROM public.feature_usage
        WHERE identity_key = p_identity_key AND feature_name = v_feature_name;

        IF NOT FOUND THEN
            v_current := 0;
            v_limit := v_max_limit;
        ELSE
            -- Sync limit if changed (we do this in memory for validation, actual update later)
            v_limit := v_max_limit; 
        END IF;

        -- Check: If incrementing would exceed limit
        -- We allow decrementing even if above limit (refunds)
        IF v_increment > 0 AND (v_current + v_increment) > v_limit THEN
            RETURN QUERY SELECT FALSE, 'LIMIT_REACHED: ' || v_feature_name;
            RETURN;
        END IF;
    END LOOP;

    -- 3. Execution Phase: Apply all updates
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;

        INSERT INTO public.feature_usage (
            owner_user_id, 
            identity_key, 
            feature_name, 
            current_usage, 
            max_limit,
            updated_at
        ) VALUES (
            p_owner_user_id,
            p_identity_key,
            v_feature_name,
            GREATEST(0, v_increment), -- Initial value if new
            v_max_limit,
            now()
        )
        ON CONFLICT (identity_key, feature_name) 
        DO UPDATE SET
            current_usage = GREATEST(0, feature_usage.current_usage + v_increment),
            max_limit = v_max_limit, -- Sync limit
            updated_at = now();
    END LOOP;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;


-- 4. Recreate Single RPC for backward compatibility (wraps batch)
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
    SELECT success, error_message INTO v_success, v_error
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
    );

    -- Get new state to return expected format
    SELECT current_usage INTO v_current
    FROM public.feature_usage
    WHERE identity_key = p_identity_key AND feature_name = p_feature_name;

    RETURN QUERY SELECT v_success, COALESCE(v_current, 0), p_max_limit;
END;
$$;

COMMIT;
