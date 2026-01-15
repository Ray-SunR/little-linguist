-- Add word column to child_vocab for efficient sorting and filtering
ALTER TABLE public.child_vocab ADD COLUMN IF NOT EXISTS word TEXT;

-- Backfill word from word_insights
UPDATE public.child_vocab cv
SET word = wi.word
FROM public.word_insights wi
WHERE cv.word_id = wi.id;

-- Add index for sorting
CREATE INDEX IF NOT EXISTS idx_child_vocab_word ON public.child_vocab(word);
