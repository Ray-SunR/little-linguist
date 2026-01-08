-- Create the child-avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('child-avatars', 'child-avatars', false)
ON CONFLICT (id) DO NOTHING;

-- Policies for child-avatars bucket
-- Guardians can see any avatar in the bucket for now? No, better restricted to own subfolder or signed URLs.
-- We use signed URLs in getChildren, so we don't need a public SELECT policy.
-- But we need ALL for management (upload/delete).

CREATE POLICY "Guardians can manage their own children avatars"
ON storage.objects FOR ALL
USING (
  bucket_id = 'child-avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'child-avatars' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);
