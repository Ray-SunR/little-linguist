-- Migration: Initialize Subscription Plans and Quotas
-- Sets up the infrastructure for usage limits and paid tiers

-- 1. Populate subscription_plans
INSERT INTO public.subscription_plans (code, name, quotas)
VALUES 
    ('free', 'Free Plan', '{"word_insight": 100, "story_generation": 3}'::jsonb),
    ('pro', 'Pro Plan', '{"word_insight": 1000, "story_generation": 20}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET quotas = EXCLUDED.quotas,
    name = EXCLUDED.name;

-- 2. Update existing profiles to have a default subscription_status
UPDATE public.profiles 
SET subscription_status = 'free' 
WHERE subscription_status IS NULL;

-- 3. Add default value for profiles.subscription_status
ALTER TABLE public.profiles 
ALTER COLUMN subscription_status SET DEFAULT 'free';
