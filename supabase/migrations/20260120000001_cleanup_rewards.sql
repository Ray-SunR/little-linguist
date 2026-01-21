-- Migration: Cleanup Legacy Reward System
-- Description: Drops the old record_activity function and associated logic.

DROP FUNCTION IF EXISTS public.record_activity(uuid, text, text, text, jsonb, integer);
