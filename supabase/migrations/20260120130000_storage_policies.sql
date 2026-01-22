-- Storage Policies for local Supabase

-- book-assets
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO public WITH CHECK ((bucket_id = 'book-assets'::text) AND (auth.role() = 'authenticated'::text));
CREATE POLICY "Public read assets" ON storage.objects FOR SELECT TO public USING (bucket_id = 'book-assets'::text);

-- word-insights-audio
CREATE POLICY "Public Access for word-insights-audio" ON storage.objects FOR SELECT TO public USING (bucket_id = 'word-insights-audio'::text);
CREATE POLICY "Service Role Access for word-insights-audio" ON storage.objects FOR ALL TO service_role USING (bucket_id = 'word-insights-audio'::text);

-- user-assets
CREATE POLICY "Isolate guest uploads by folder" ON storage.objects FOR INSERT TO public WITH CHECK ((bucket_id = 'user-assets'::text) AND ((storage.foldername(name))[1] = 'guests'::text) AND ((storage.foldername(name))[2] IS NOT NULL));
CREATE POLICY "Isolate guest reads by folder" ON storage.objects FOR SELECT TO public USING ((bucket_id = 'user-assets'::text) AND ((storage.foldername(name))[1] = 'guests'::text) AND ((storage.foldername(name))[2] IS NOT NULL));
CREATE POLICY "Guardians can manage their own assets" ON storage.objects FOR ALL TO public USING ((bucket_id = 'user-assets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)) WITH CHECK ((bucket_id = 'user-assets'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text));
