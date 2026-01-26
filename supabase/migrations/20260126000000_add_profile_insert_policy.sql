-- Add missing INSERT policy for profiles to allow self-healing in Server Actions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Users can insert their own profile'
    ) THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles 
        FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;
