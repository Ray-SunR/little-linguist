-- Rename confusing scene columns to match the new terminology
ALTER TABLE public.stories
RENAME COLUMN scene_count TO story_length_minutes;

ALTER TABLE public.stories
RENAME COLUMN image_count TO image_scene_count;

ALTER TABLE public.stories
RENAME COLUMN scenes TO sections;
