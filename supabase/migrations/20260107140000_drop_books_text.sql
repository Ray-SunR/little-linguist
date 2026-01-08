-- Migration: Drop legacy text column from books table
-- This column is unused as content is stored in book_contents.full_text
-- It currently has a NOT NULL constraint causing issues with new inserts.

ALTER TABLE public.books DROP COLUMN IF EXISTS text;
