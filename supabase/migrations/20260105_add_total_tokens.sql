-- Migration: Add total_tokens column to books table
-- Purpose: Optimization for lazy loading to avoid fetching full tokens array
-- Applied: 2026-01-05

ALTER TABLE books ADD COLUMN IF NOT EXISTS total_tokens INTEGER;

-- Backfill existing data
UPDATE books 
SET total_tokens = jsonb_array_length(tokens) 
WHERE tokens IS NOT NULL AND total_tokens IS NULL;
