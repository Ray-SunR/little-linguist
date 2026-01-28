-- Seed Data for Raiden
-- This file is automatically executed by 'supabase db reset' or can be manually applied.

-- Subscription Plans
INSERT INTO public.subscription_plans (code, name, quotas)
VALUES 
  ('free', 'Free Plan', '{"story_generation": 5, "image_generation": 10, "word_insight": 50, "magic_sentence": 20}'::jsonb),
  ('pro', 'Pro Plan', '{"story_generation": 100, "image_generation": 200, "word_insight": 1000, "magic_sentence": 500}'::jsonb)
ON CONFLICT (code) DO UPDATE 
SET name = EXCLUDED.name, quotas = EXCLUDED.quotas;
