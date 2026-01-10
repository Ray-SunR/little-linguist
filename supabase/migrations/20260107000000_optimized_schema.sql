-- ==========================================
-- 1. Core Household & Multi-Profile Support
-- ==========================================

-- Profiles (Guardian/Household)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Children Profiles
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  first_name TEXT NOT NULL,
  last_name TEXT,
  birth_year INT,
  gender TEXT,
  interests TEXT[] NOT NULL DEFAULT '{}',
  ability_tier TEXT,
  learning_objectives JSONB NOT NULL DEFAULT '{}',
  avatar_paths JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of storage paths for avatar photos
  primary_avatar_index INT DEFAULT 0  -- Index of the primary avatar in avatar_paths array
);

CREATE INDEX IF NOT EXISTS children_owner_user_id_idx ON public.children (owner_user_id);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;

-- Media Assets (Private storage tracking)
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT,
  bytes BIGINT,
  sha256 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bucket, path)
);

CREATE INDEX IF NOT EXISTS media_assets_owner_user_id_idx ON public.media_assets (owner_user_id);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. Optimized Content Model (BookV1/V2 Ready)
-- ==========================================

-- Books Metadata (Lightweight for library/egress)
CREATE TABLE IF NOT EXISTS public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_key TEXT NOT NULL UNIQUE, -- slug: "ginger-the-giraffe"
  title TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'system', -- system | ai_generated
  schema_version INT NOT NULL DEFAULT 1, -- 1=BookV1, 2=BookV2
  voice_id TEXT DEFAULT 'Kevin',
  total_tokens INT, -- used for progress calculating without loading tokens
  estimated_reading_time INT,
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- NULL for system books
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  images JSONB DEFAULT '[]'::jsonb, -- metadata about images (src, caption)
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS books_origin_idx ON public.books (origin);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Book Contents (Heavy data: tokens & full text)
-- Separated to optimize egress for metadata-only requests
CREATE TABLE IF NOT EXISTS public.book_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE UNIQUE,
  tokens JSONB, -- The large token array
  full_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.book_contents ENABLE ROW LEVEL SECURITY;

-- Book Audios & Media (Specific assets)
CREATE TABLE IF NOT EXISTS public.book_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  voice_id TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  timings JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_word_index INT,
  end_word_index INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(book_id, chunk_index, voice_id)
);

CREATE TABLE IF NOT EXISTS public.book_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'image',
  after_word_index INT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.book_audios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_media ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 3. Child-Centric Learning & Progress
-- ==========================================

-- Reading Progress (Keyed by Child ID)
CREATE TABLE IF NOT EXISTS public.child_book_progress (
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  last_token_index INT DEFAULT 0,
  last_shard_index INT DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  total_read_seconds INT DEFAULT 0,
  playback_speed NUMERIC DEFAULT 1.0,
  PRIMARY KEY (child_id, book_id)
);

ALTER TABLE public.child_book_progress ENABLE ROW LEVEL SECURITY;

-- Word Insights (AI definitions cache)
CREATE TABLE IF NOT EXISTS public.word_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL DEFAULT 'en',
  normalized TEXT NOT NULL, -- normalized word (lowercase, lemmatized)
  display TEXT NOT NULL,    -- word as displayed in text
  
  -- Insight Data
  definition TEXT,
  pronunciation TEXT,
  examples TEXT[],
  
  -- Audio Assets
  audio_path TEXT, -- Definition audio
  word_audio_path TEXT,
  example_audio_paths TEXT[],
  
  -- Timings
  timing_markers JSONB DEFAULT '[]'::jsonb,
  example_timing_markers JSONB DEFAULT '[]'::jsonb,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(language, normalized)
);

-- Child Personal Vocabulary (SRS)
CREATE TABLE IF NOT EXISTS public.child_vocab (
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.word_insights(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'learning', -- learning | mastered | reviewing
  source_type TEXT NOT NULL, -- clicked | imported | manual
  origin_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  -- SRS fields
  next_review_at TIMESTAMPTZ,
  interval_days INT DEFAULT 0,
  ease NUMERIC DEFAULT 2.5,
  reps INT DEFAULT 0,
  PRIMARY KEY (child_id, word_id)
);

ALTER TABLE public.child_vocab ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 4. Economy & Sessions
-- ==========================================

-- Learning Sessions
CREATE TABLE IF NOT EXISTS public.learning_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL DEFAULT 'reading', -- reading | review | creation
  book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  summary JSONB DEFAULT '{}'::jsonb
);

-- Point Ledger (Auditable transactions)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  amount INT NOT NULL, -- + earns, - spends
  reason TEXT,         -- 'finished_book', 'srs_accuracy', 'story_gen'
  session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  idempotency_key TEXT,
  UNIQUE(child_id, idempotency_key)
);

-- AI Stories (Content Cache)
CREATE TABLE IF NOT EXISTS public.stories (
  id UUID PRIMARY KEY REFERENCES public.books(id) ON DELETE CASCADE,
  owner_user_id UUID DEFAULT auth.uid() REFERENCES public.profiles(id),
  child_id UUID REFERENCES public.children(id),
  main_character_description TEXT,
  scenes JSONB NOT NULL, -- Array of {text, image_prompt, after_word_index}
  status TEXT DEFAULT 'generating',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story Generation Jobs
CREATE TABLE IF NOT EXISTS public.story_generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- 5. Subscriptions & Quotas
-- ==========================================

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  code TEXT PRIMARY KEY, -- free, basic, premium
  name TEXT NOT NULL,
  quotas JSONB NOT NULL -- {stories_per_month: 2, tts_chars: 50000}
);

CREATE TABLE IF NOT EXISTS public.usage_meter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL, -- story_gen, tts_chars, ai_images
  quantity BIGINT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ref_id UUID -- ID of book/job that caused the usage
);

-- ==========================================
-- 6. Policies (RLS)
-- ==========================================

-- Profiles (Guardian/Household)
-- Profile: Own row only
CREATE POLICY "Users can only view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can only update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Children: owner_user_id only
CREATE POLICY "Guardians can manage their own children" ON public.children 
  FOR ALL USING (auth.uid() = owner_user_id);

-- Books: System (all) + own generated
CREATE POLICY "Users can view all system or owned books" ON public.books
  FOR SELECT USING (origin = 'system' OR owner_user_id = auth.uid());

-- Book Contents: Same as books
CREATE POLICY "Users can view book contents" ON public.book_contents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.books b WHERE b.id = book_id AND (b.origin = 'system' OR b.owner_user_id = auth.uid())
  ));

CREATE POLICY "Users can view book audios" ON public.book_audios
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.books b WHERE b.id = book_id AND (b.origin = 'system' OR b.owner_user_id = auth.uid())
  ));

CREATE POLICY "Users can view book media" ON public.book_media
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.books b WHERE b.id = book_id AND (b.origin = 'system' OR b.owner_user_id = auth.uid())
  ));

-- Child Specific Data: Via Join
CREATE POLICY "Guardians can manage child progress" ON public.child_book_progress
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.children c WHERE c.id = child_id AND c.owner_user_id = auth.uid()
  ));

CREATE POLICY "Guardians can manage child vocab" ON public.child_vocab
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.children c WHERE c.id = child_id AND c.owner_user_id = auth.uid()
  ));

CREATE POLICY "Guardians can manage child sessions" ON public.learning_sessions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.children c WHERE c.id = child_id AND c.owner_user_id = auth.uid()
  ));

CREATE POLICY "Guardians can manage their stories" ON public.stories
  FOR ALL USING (owner_user_id = auth.uid());

CREATE POLICY "Guardians can manage their story jobs" ON public.story_generation_jobs
  FOR ALL USING (owner_user_id = auth.uid());

-- ==========================================
-- 7. Storage Initialization
-- ==========================================

INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('book-assets', 'book-assets', true),
  ('guardian-photos', 'guardian-photos', false),
  ('word-insights-audio', 'word-insights-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (Public)
CREATE POLICY "Public Access to book-assets" ON storage.objects FOR SELECT USING (bucket_id = 'book-assets');
CREATE POLICY "Service Role Upload to book-assets" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'book-assets');

-- Storage Policies (Private - Guardian Only)
CREATE POLICY "Guardians can manage their photos" ON storage.objects FOR ALL 
  USING (bucket_id = 'guardian-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
