-- Create the user-assets bucket for generic asset storage (avatars, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-assets', 'user-assets', false)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for user-assets bucket
-- Guardians can only access their own subfolder (named after their auth.uid())
CREATE POLICY "Guardians can manage their own assets"
ON storage.objects FOR ALL
USING (
  bucket_id = 'user-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'user-assets' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure children table has the necessary columns for avatars
-- (These might already exist from optimized_schema.sql but we ensure them here)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'avatar_paths') THEN
        ALTER TABLE public.children ADD COLUMN avatar_paths JSONB NOT NULL DEFAULT '[]'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'primary_avatar_index') THEN
        ALTER TABLE public.children ADD COLUMN primary_avatar_index INT DEFAULT 0;
    END IF;
END $$;

-- Ensure updated_at trigger exists for children table
-- We assume the handle_updated_at function already exists (common in Supabase setups)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_children_updated_at ON public.children;
CREATE TRIGGER set_children_updated_at
BEFORE UPDATE ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
