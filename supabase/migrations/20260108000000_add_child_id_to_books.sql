-- Add child_id to books table
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS books_child_id_idx ON public.books (child_id);

-- Update RLS policies?
-- Actually, the existing policy "Users can view all system or owned books" checks guardian_id.
-- Since we want explicit child visibility filtering, we will handle that in the application layer 
-- (Repository) as planned. The guardian_id check is sufficient for "Access Control" (Guardians own the child's data).
-- However, we might want to ensure that IF a child_id is set, it matches the child we are looking for.
-- But standard RLS is usually purely auth-based.
-- We'll leave RLS as IS for now, relying on guardian_id.
