-- 1. Support identity_key in point_transactions for guest idempotency
ALTER TABLE public.point_transactions ADD COLUMN IF NOT EXISTS identity_key TEXT;

-- 2. Update unique index to handle guest idempotency (using identity_key as the anchor)
-- We remove the old index that relied on owner_user_id
DROP INDEX IF EXISTS public.point_transactions_owner_idempotency_reason_idx;
CREATE UNIQUE INDEX point_transactions_idempotency_anchor_idx 
ON public.point_transactions (identity_key, idempotency_key, reason);

-- 3. Update the RPC to use identity_key and ensure all usage is logged
CREATE OR REPLACE FUNCTION public.increment_batch_feature_usage(
    p_identity_key TEXT,
    p_updates JSONB, 
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
    v_child_id UUID;
    v_metadata JSONB;
    v_idempotency_key TEXT;
    v_is_processed BOOLEAN;
BEGIN
    -- 1. Lock all relevant rows in a consistent order
    PERFORM 1 
    FROM public.feature_usage 
    WHERE identity_key = p_identity_key 
      AND feature_name IN (
          SELECT (value->>'feature_name') 
          FROM jsonb_array_elements(p_updates)
      )
    ORDER BY feature_name -- Prevent deadlocks by locking in consistent order
    FOR UPDATE;

    -- 2. Phase 1: Validation
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;
        v_idempotency_key := v_update->>'idempotency_key';

        -- A. IDEMPOTENCY CHECK BEFORE VALIDATION
        IF v_idempotency_key IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.point_transactions 
                WHERE identity_key = p_identity_key 
                  AND idempotency_key = v_idempotency_key
                  AND reason = v_feature_name
            ) INTO v_is_processed;
            
            IF v_is_processed THEN
                CONTINUE;
            END IF;
        END IF;

        -- B. QUOTA VALIDATION
        SELECT current_usage, max_limit 
        INTO v_current, v_limit
        FROM public.feature_usage
        WHERE identity_key = p_identity_key AND feature_name = v_feature_name;

        IF NOT FOUND THEN
            v_current := 0;
            v_limit := v_max_limit;
        ELSE
            v_limit := v_max_limit; 
        END IF;

        IF v_increment > 0 AND (v_current + v_increment) > v_limit THEN
            RETURN QUERY SELECT FALSE, 'LIMIT_REACHED: ' || v_feature_name;
            RETURN;
        END IF;
    END LOOP;

    -- 3. Execution Phase
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates) ORDER BY (value->>'feature_name')
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;
        v_child_id := (v_update->>'child_id')::UUID;
        v_metadata := (v_update->>'metadata')::JSONB;
        v_idempotency_key := v_update->>'idempotency_key';
        
        -- A. RE-CHECK IDEMPOTENCY
        IF v_idempotency_key IS NOT NULL THEN
            IF EXISTS (
                SELECT 1 FROM public.point_transactions 
                WHERE identity_key = p_identity_key 
                  AND idempotency_key = v_idempotency_key
                  AND reason = v_feature_name
            ) THEN
                CONTINUE;
            END IF;
        END IF;

        -- B. Update Usage
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
            GREATEST(0, v_increment),
            v_max_limit,
            now()
        )
        ON CONFLICT (identity_key, feature_name) 
        DO UPDATE SET
            current_usage = GREATEST(0, feature_usage.current_usage + v_increment),
            max_limit = v_max_limit,
            updated_at = now();
            
        -- C. Log Point Transaction (Ledger) - LOG FOR EVERYONE
        IF v_increment != 0 THEN
            INSERT INTO public.point_transactions (
                owner_user_id,
                identity_key,
                child_id,
                amount,
                reason, 
                metadata,
                idempotency_key
            ) VALUES (
                p_owner_user_id,
                p_identity_key,
                v_child_id,
                -1 * v_increment,
                v_feature_name,
                COALESCE(v_metadata, '{}'::jsonb),
                v_idempotency_key
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;
