-- Create word_insights table
CREATE TABLE IF NOT EXISTS public.word_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT UNIQUE NOT NULL,
    definition TEXT NOT NULL,
    pronunciation TEXT,
    examples JSONB DEFAULT '[]'::jsonb,
    audio_path TEXT,
    timing_markers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.word_insights ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to word_insights"
ON public.word_insights FOR SELECT
USING (true);

-- Allow service role to manage everything
CREATE POLICY "Allow service role to manage word_insights"
ON public.word_insights FOR ALL
TO service_role
USING (true);

-- Ensure storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('word-insights-audio', 'word-insights-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
-- Note: We use specific names to avoid conflicts with other bucket policies
CREATE POLICY "Public Access for word-insights-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'word-insights-audio');

CREATE POLICY "Service Role Access for word-insights-audio"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'word-insights-audio');
