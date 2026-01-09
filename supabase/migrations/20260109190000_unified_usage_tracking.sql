-- Migration: Unified Feature Usage Tracking
-- Transition from guest_usage to feature_usage to support authenticated users

-- 1. Rename table if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'guest_usage') THEN
        ALTER TABLE public.guest_usage RENAME TO feature_usage;
        -- Rename the existing primary key constraint if it exists
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'guest_usage_pkey') THEN
            ALTER TABLE public.feature_usage RENAME CONSTRAINT guest_usage_pkey TO feature_usage_pkey_old;
        END IF;
    END IF;
END $$;

-- 2. Ensure the table exists
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_id TEXT,
    identity_key TEXT,
    feature_name TEXT NOT NULL,
    current_usage INTEGER DEFAULT 0,
    max_limit INTEGER DEFAULT 5,
    reset_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Identity Key Logic
-- Populate identity_key from existing user_id or guest_id
UPDATE public.feature_usage 
SET identity_key = COALESCE(user_id::text, guest_id) 
WHERE identity_key IS NULL;

-- 4. Constraints
ALTER TABLE public.feature_usage ALTER COLUMN guest_id DROP NOT NULL;
ALTER TABLE public.feature_usage ALTER COLUMN identity_key SET NOT NULL;

-- Ensure identity check: either user_id or guest_id must be present
ALTER TABLE public.feature_usage DROP CONSTRAINT IF EXISTS feature_usage_identity_check;
ALTER TABLE public.feature_usage ADD CONSTRAINT feature_usage_identity_check CHECK (user_id IS NOT NULL OR guest_id IS NOT NULL);

-- Unique entries per identity per feature
ALTER TABLE public.feature_usage DROP CONSTRAINT IF EXISTS feature_usage_identity_key_feature_name_key;
ALTER TABLE public.feature_usage ADD CONSTRAINT feature_usage_identity_key_feature_name_key UNIQUE (identity_key, feature_name);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_feature_usage_updated_at ON public.feature_usage;
CREATE TRIGGER update_feature_usage_updated_at
    BEFORE UPDATE ON public.feature_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
