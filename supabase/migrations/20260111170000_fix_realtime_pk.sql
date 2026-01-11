BEGIN;

-- Add ID column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'feature_usage' AND column_name = 'id') THEN
        ALTER TABLE public.feature_usage ADD COLUMN id UUID DEFAULT gen_random_uuid();
    END IF;
END $$;

-- Make it Primary Key
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'feature_usage' AND constraint_type = 'PRIMARY KEY') THEN
        ALTER TABLE public.feature_usage ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Enable Full Replica Identity for robust realtime updates
ALTER TABLE public.feature_usage REPLICA IDENTITY FULL;

COMMIT;
