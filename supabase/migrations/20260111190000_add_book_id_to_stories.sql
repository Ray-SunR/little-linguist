-- Add book_id column to stories table to link generation tasks to resulting books
ALTER TABLE public.stories
ADD COLUMN book_id uuid REFERENCES public.books(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.stories.book_id IS 'Reference to the book generated from this story task';
