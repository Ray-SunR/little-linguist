-- Migration to add level filtering and metadata columns to books table

ALTER TABLE books
ADD COLUMN IF NOT EXISTS level TEXT,
ADD COLUMN IF NOT EXISTS min_grade SMALLINT,
ADD COLUMN IF NOT EXISTS is_nonfiction BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS length_category TEXT;

-- Add comments for clarity
COMMENT ON COLUMN books.level IS 'Display label for grade level (e.g., "Pre-K", "G1-2")';
COMMENT ON COLUMN books.min_grade IS 'Numeric value for range filtering: Pre-K=-1, K=0, G1-2=1, G3-5=3';
COMMENT ON COLUMN books.is_nonfiction IS 'Whether the book is non-fiction';
COMMENT ON COLUMN books.length_category IS 'Reading length category (Short, Medium, Long)';
