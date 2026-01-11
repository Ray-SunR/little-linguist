-- Migration: Add Technical Tracing to Stories
-- Adds columns to store raw AI prompts and responses for troubleshooting

ALTER TABLE public.stories
ADD COLUMN raw_prompt TEXT,
ADD COLUMN raw_response JSONB;

COMMENT ON COLUMN public.stories.raw_prompt IS 'The exact prompt sent to the AI provider';
COMMENT ON COLUMN public.stories.raw_response IS 'The raw JSON response received from the AI provider';
