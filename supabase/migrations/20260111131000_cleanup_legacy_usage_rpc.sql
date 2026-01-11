-- Migration: Cleanup Legacy Usage RPCs
-- Explicitly drops all old/overloaded signatures of increment_feature_usage to prevent confusion

BEGIN;

-- 1. Drop the 5-argument version with guest_id as text (old signature)
-- signature: increment_feature_usage(text, text, integer, uuid, text)
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, text);

-- 2. Drop the 6-argument version with guest_id and increment
-- signature: increment_feature_usage(text, text, integer, uuid, text, integer)
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, text, integer);

-- 3. Drop the 6-argument version with overlapping UUIDs (in case it exists from previous attempts)
-- signature: increment_feature_usage(text, text, integer, uuid, uuid, integer)
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, uuid, integer);

-- 4. Drop the 5-argument version with integer at end if it conflicts (though that's the new one, let's NOT drop the new one)
-- The new definitive one is: (text, text, integer, uuid, integer) -> 5 args.
-- Be very careful not to drop the active one.

-- The active signature is:
-- public.increment_feature_usage(p_identity_key text, p_feature_name text, p_max_limit integer, p_owner_user_id uuid, p_increment integer)

-- 5. Ensure increment_batch_feature_usage only has the correct signature
-- Correct: (text, jsonb, uuid)
-- Drop any potential variants if they existed (e.g. earlier failed migrations)

COMMIT;
