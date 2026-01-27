DO $$ BEGIN
    CREATE TYPE public.currency_type AS ENUM ('lumo_coin', 'credit');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

ALTER TABLE public.point_transactions 
ADD COLUMN IF NOT EXISTS transaction_type public.currency_type DEFAULT 'credit';

UPDATE public.point_transactions
SET transaction_type = 'lumo_coin'
WHERE reason IN ('book_opened', 'book_completed', 'mission_completed', 'word_insight_viewed', 'word_added', 'magic_sentence_generated', 'story_generated');
