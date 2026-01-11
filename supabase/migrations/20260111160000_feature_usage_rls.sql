-- Enable RLS on feature_usage 
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Authenticated users can view all usage" ON public.feature_usage;
DROP POLICY IF EXISTS "Public can view guest usage" ON public.feature_usage;

-- Policy for Authenticated Users: Can read their own usage
-- Uses owner_user_id = auth.uid() (both UUID, type-compatible)
CREATE POLICY "Users can view own usage" 
ON public.feature_usage 
FOR SELECT 
TO authenticated 
USING (owner_user_id = auth.uid());

-- Policy for Guests: Can read rows where owner_user_id is NULL
CREATE POLICY "Public can view guest usage" 
ON public.feature_usage 
FOR SELECT 
TO anon 
USING (owner_user_id IS NULL);

-- Note: No INSERT/UPDATE/DELETE policies for authenticated/anon
-- All writes go through SECURITY DEFINER RPC functions with service role
