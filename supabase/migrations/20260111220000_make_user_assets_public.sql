-- Make user-assets bucket public to allow getPublicUrl to work for avatars
UPDATE storage.buckets
SET public = true
WHERE id = 'user-assets';

-- Ensure it exists if it didn't (safeguard)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-assets', 'user-assets', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- Ensure RLS policy allows public SELECT (reading)
CREATE POLICY "Public can view user assets"
ON storage.objects FOR SELECT
USING ( bucket_id = 'user-assets' );
