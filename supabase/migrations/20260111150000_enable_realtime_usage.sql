-- Enable Realtime for feature_usage table
begin;
  -- If the publication doesn't exist, create it (should already exists in most supabase projects)
  -- But we specifically want to add feature_usage to the supabase_realtime publication
  alter publication supabase_realtime add table public.feature_usage;
commit;
