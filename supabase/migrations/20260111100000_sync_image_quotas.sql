-- Migration: Sync Image Quotas & Fix RPC Overloading
-- 1. Drop ambiguous functions to resolve PGRST203
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, text, integer);
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, uuid, integer);
DROP FUNCTION IF EXISTS public.increment_feature_usage(text, text, integer, uuid, text);

-- 2. Update subscription plans with image_generation quotas (Seed missing data)
UPDATE public.subscription_plans
SET quotas = jsonb_set(
    quotas,
    '{image_generation}',
    CASE 
        WHEN code = 'free' THEN '10'::jsonb
        WHEN code = 'pro' THEN '100'::jsonb
        ELSE '10'::jsonb
    END
);

-- No-op: This migration is superseded by 20260111130000_consolidate_usage.sql
-- We modify this file to do nothing to prevent migration conflicts in fresh environments.
