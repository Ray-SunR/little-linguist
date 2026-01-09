ALTER TABLE child_book_progress ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;
