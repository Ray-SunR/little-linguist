-- Revert user-assets bucket to private for security
UPDATE storage.buckets
SET public = false
WHERE id = 'user-assets';

-- Drop the public read policy we added
DROP POLICY IF EXISTS "Public can view user assets" ON storage.objects;
