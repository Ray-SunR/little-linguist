-- Create user_words table
CREATE TABLE IF NOT EXISTS public.user_words (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    word TEXT REFERENCES public.word_insights(word) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- A user can save the same word from different books. 
    -- If a book is deleted, the word is preserved with book_id as NULL.
    UNIQUE (user_id, word, book_id)
);

-- Enable RLS
ALTER TABLE public.user_words ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can only view their own words"
ON public.user_words FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can only add to their own words"
ON public.user_words FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only remove their own words"
ON public.user_words FOR DELETE
USING (auth.uid() = user_id);
