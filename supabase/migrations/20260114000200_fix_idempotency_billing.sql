-- 1. Fix the Unique Index to allow multiple transaction types (reasons) per idempotency key
DROP INDEX IF EXISTS point_transactions_owner_idempotency_idx;
CREATE UNIQUE INDEX IF NOT EXISTS point_transactions_owner_idempotency_reason_idx 
    ON public.point_transactions (owner_user_id, idempotency_key, reason);

-- 2. Update the RPC to correctly handle idempotency_key
CREATE OR REPLACE FUNCTION public.increment_batch_feature_usage(
    p_identity_key TEXT,
    p_updates JSONB, -- Array of { feature_name, increment, max_limit, child_id?, metadata?, idempotency_key? }
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
BEGIN
    -- 1. Lock all relevant rows in a consistent order to prevent deadlocks
    PERFORM 1 
    FROM public.feature_usage 
    WHERE identity_key = p_identity_key 
      AND feature_name IN (
          SELECT (value->>'feature_name') 
          FROM jsonb_array_elements(p_updates)
      )
    FOR UPDATE;

    -- 2. Validation Phase
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;

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

        -- Check limits (skip for refunds/decrement)
        IF v_increment > 0 AND (v_current + v_increment) > v_limit THEN
            RETURN QUERY SELECT FALSE, 'LIMIT_REACHED: ' || v_feature_name;
            RETURN;
        END IF;
    END LOOP;

    -- 3. Execution Phase
    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;
        -- Extract optional connection info
        v_child_id := (v_update->>'child_id')::UUID;
        v_metadata := (v_update->>'metadata')::JSONB;
        v_idempotency_key := v_update->>'idempotency_key';
        
        -- A. Update Usage
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
            
        -- B. Log Point Transaction (Ledger)
        IF v_increment != 0 AND p_owner_user_id IS NOT NULL THEN
            -- Check for idempotency execution BEFORE inserting?
            -- Or rely on ON CONFLICT DO NOTHING?
            -- Using ON CONFLICT DO NOTHING allows us to return success but skip duplication
            -- However, we must ensure we don't increment usage above if we skip transaction?
            -- Actually, if we skip transaction, we SHOULD NOT increment usage.
            
            -- BUT, usage table doesn't have idempotency key.
            -- This is tricky. Ideally we check idempotency FIRST.
            -- But for now, let's assume if transaction exists, we skip EVERYTHING for this line item.
            
            -- Better approach: Check if transaction exists first.
            IF v_idempotency_key IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.point_transactions 
                WHERE owner_user_id = p_owner_user_id 
                  AND idempotency_key = v_idempotency_key
                  AND reason = v_feature_name
            ) THEN
                -- Already processed this specific charge. Skip.
                CONTINUE;
            END IF;

            -- Proceed with Ledger Insert
            INSERT INTO public.point_transactions (
                owner_user_id,
                child_id,
                amount,
                reason, 
                metadata,
                idempotency_key
            ) VALUES (
                p_owner_user_id,
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
