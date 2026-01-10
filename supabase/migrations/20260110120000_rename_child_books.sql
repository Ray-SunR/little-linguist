-- Rename table
ALTER TABLE IF EXISTS child_book_progress RENAME TO child_books;

-- Rename indexes (optional but good for consistency)
ALTER INDEX IF EXISTS child_book_progress_pkey RENAME TO child_books_pkey;
ALTER INDEX IF EXISTS child_book_progress_child_id_book_id_key RENAME TO child_books_child_id_book_id_key;

-- Note: RLS policies attached to the table are automatically carried over.
-- However, if any policy definitions explicitly referenced 'child_book_progress' 
-- (e.g. in a subquery for another table's policy), those might need checking. 
-- For a simple join table like this, usually self-references are just 'child_book_progress' which Postgres updates, 
-- or implicit.
