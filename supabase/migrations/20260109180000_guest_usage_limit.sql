-- Create guest_usage table for scalable AI feature tracking
CREATE TABLE IF NOT EXISTS public.guest_usage (
    guest_id TEXT NOT NULL,
    feature_name TEXT NOT NULL,
    current_usage INTEGER DEFAULT 0,
    max_limit INTEGER DEFAULT 5,
    metadata JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (guest_id, feature_name)
);

-- Enable RLS but don't add any public policies. 
-- Only service_role can access this table by default if no policies exist.
ALTER TABLE public.guest_usage ENABLE ROW LEVEL SECURITY;

-- Note: No policies added for anon or authenticated roles.
-- This ensures only the service role (server-side) can read/write.

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_guest_usage_updated_at
    BEFORE UPDATE ON public.guest_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
