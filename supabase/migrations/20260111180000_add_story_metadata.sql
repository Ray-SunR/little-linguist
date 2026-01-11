-- Add metadata columns to stories table
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS scene_count INT,
ADD COLUMN IF NOT EXISTS image_count INT,
ADD COLUMN IF NOT EXISTS child_name TEXT,
ADD COLUMN IF NOT EXISTS child_age INT,
ADD COLUMN IF NOT EXISTS child_gender TEXT,
ADD COLUMN IF NOT EXISTS words_used JSONB DEFAULT '[]'::jsonb;
