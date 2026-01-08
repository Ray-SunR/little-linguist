-- Migration: Rename term_id to word_id and drop vocab_terms
-- This migration:
-- 1. Renames term_id column to word_id in child_vocab table
-- 2. Updates the foreign key constraint to reference word_insights(id)
-- 3. Drops the legacy vocab_terms table

-- Step 1: Drop existing foreign key constraint on child_vocab
DO $$
BEGIN
  -- Drop any FK constraint that references either vocab_terms or word_insights
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'child_vocab' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name = 'child_vocab_term_id_fkey'
  ) THEN
    ALTER TABLE public.child_vocab DROP CONSTRAINT child_vocab_term_id_fkey;
  END IF;
END $$;

-- Step 2: Drop the primary key constraint before renaming columns
ALTER TABLE public.child_vocab DROP CONSTRAINT IF EXISTS child_vocab_pkey;

-- Step 3: Rename term_id column to word_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'child_vocab' AND column_name = 'term_id'
  ) THEN
    ALTER TABLE public.child_vocab RENAME COLUMN term_id TO word_id;
  END IF;
END $$;

-- Step 4: Re-add the primary key with the new column name
ALTER TABLE public.child_vocab ADD PRIMARY KEY (child_id, word_id);

-- Step 5: Add foreign key constraint to word_insights with the new column name
ALTER TABLE public.child_vocab
ADD CONSTRAINT child_vocab_word_id_fkey 
FOREIGN KEY (word_id) REFERENCES public.word_insights(id) ON DELETE CASCADE;

-- Step 6: Drop the vocab_terms table if it exists
DROP TABLE IF EXISTS public.vocab_terms CASCADE;

-- Step 7: Log completion
DO $$
BEGIN
  RAISE NOTICE 'Migration complete: term_id renamed to word_id, vocab_terms dropped';
END $$;
