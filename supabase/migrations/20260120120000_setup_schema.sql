-- Migration: Setup Complete Schema
-- Description: Sets up the entire schema including extensions, tables, functions, and policies.

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "hypopg";
CREATE EXTENSION IF NOT EXISTS "index_advisor";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE public.audit_action_type AS ENUM (
        'user.login', 'user.logout', 'identity.merged', 'story.started', 'story.generated',
        'story.failed', 'word_insight.generated', 'word_insight.viewed', 'book.favorited',
        'book.unfavorited', 'book.opened', 'word.added', 'word.removed', 'child_profile.created',
        'child_profile.updated', 'child_profile.deleted', 'child_profile.switched',
        'child_profile.library_settings_updated', 'image.uploaded', 'magic_sentence.generated',
        'magic_sentence.failed', 'book.completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.audit_entity_type AS ENUM (
        'user', 'story', 'book', 'word', 'child_profile', 'image', 'magic_sentence'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Utility Functions (Pre-Tables)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. Tables

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    email TEXT,
    subscription_status TEXT NOT NULL DEFAULT 'free',
    stripe_customer_id TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Books
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_key TEXT UNIQUE,
    title TEXT,
    origin TEXT DEFAULT 'system',
    schema_version INT DEFAULT 1,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    voice_id TEXT,
    owner_user_id UUID REFERENCES auth.users(id),
    total_tokens INT,
    estimated_reading_time INT,
    cover_image_path TEXT,
    child_id UUID,
    categories TEXT[],
    level TEXT,
    min_grade SMALLINT,
    is_nonfiction BOOLEAN DEFAULT false,
    length_category TEXT,
    description TEXT,
    keywords TEXT[],
    embedding vector(1024)
);
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_books_modtime BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Children
CREATE TABLE IF NOT EXISTS public.children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    birth_year INT,
    gender TEXT,
    interests TEXT[],
    ability_tier TEXT,
    learning_objectives JSONB DEFAULT '{}',
    avatar_asset_path TEXT,
    updated_at TIMESTAMPTZ DEFAULT now(),
    avatar_paths JSONB DEFAULT '[]',
    primary_avatar_index INT DEFAULT 0,
    library_settings JSONB DEFAULT '{}',
    total_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    streak_count INT DEFAULT 0,
    max_streak INT DEFAULT 0,
    last_activity_at TIMESTAMPTZ,
    earned_badges JSONB DEFAULT '{}'
);
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_children_modtime BEFORE UPDATE ON public.children FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Stories
CREATE TABLE IF NOT EXISTS public.stories (
    id UUID PRIMARY KEY,
    owner_user_id UUID REFERENCES auth.users(id),
    child_name TEXT,
    child_age INT,
    child_gender TEXT,
    words_used TEXT[],
    main_character_description TEXT,
    sections JSONB,
    status TEXT DEFAULT 'generating',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    avatar_url TEXT,
    child_id UUID REFERENCES public.children(id),
    story_length_minutes INT,
    image_scene_count INT,
    book_id UUID REFERENCES public.books(id),
    raw_prompt TEXT,
    raw_response JSONB,
    generation_logs JSONB DEFAULT '[]',
    error_message TEXT,
    CONSTRAINT check_status CHECK (status IN ('generating', 'completed', 'failed'))
);
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_stories_modtime BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Book Audios
CREATE TABLE IF NOT EXISTS public.book_audios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    chunk_index INT,
    start_word_index INT,
    end_word_index INT,
    audio_path TEXT,
    timings JSONB DEFAULT '[]',
    voice_id TEXT DEFAULT 'Joanna',
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_user_id UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(book_id, chunk_index, voice_id)
);
ALTER TABLE public.book_audios ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_book_audios_modtime BEFORE UPDATE ON public.book_audios FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Book Media
CREATE TABLE IF NOT EXISTS public.book_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    media_type TEXT,
    path TEXT,
    after_word_index INT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    owner_user_id UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.book_media ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_book_media_modtime BEFORE UPDATE ON public.book_media FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Word Insights
CREATE TABLE IF NOT EXISTS public.word_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    word TEXT UNIQUE,
    definition TEXT,
    pronunciation TEXT,
    examples JSONB DEFAULT '[]',
    audio_path TEXT,
    timing_markers JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    word_audio_path TEXT,
    example_audio_paths JSONB DEFAULT '[]',
    example_timing_markers JSONB DEFAULT '[]'
);
ALTER TABLE public.word_insights ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_word_insights_modtime BEFORE UPDATE ON public.word_insights FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Book Contents
CREATE TABLE IF NOT EXISTS public.book_contents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id UUID UNIQUE REFERENCES public.books(id) ON DELETE CASCADE,
    tokens JSONB,
    full_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.book_contents ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_book_contents_modtime BEFORE UPDATE ON public.book_contents FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Child Books
CREATE TABLE IF NOT EXISTS public.child_books (
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    book_id UUID REFERENCES public.books(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    last_token_index INT DEFAULT 0,
    last_shard_index INT DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    total_read_seconds INT DEFAULT 0,
    playback_speed NUMERIC DEFAULT 1.0,
    is_favorite BOOLEAN DEFAULT false,
    PRIMARY KEY (child_id, book_id)
);
ALTER TABLE public.child_books ENABLE ROW LEVEL SECURITY;

-- Child Vocab
CREATE TABLE IF NOT EXISTS public.child_vocab (
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    word_id UUID REFERENCES public.word_insights(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'learning',
    source_type TEXT,
    origin_book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    last_seen_at TIMESTAMPTZ DEFAULT now(),
    next_review_at TIMESTAMPTZ,
    interval_days INT DEFAULT 0,
    ease NUMERIC DEFAULT 2.5,
    reps INT DEFAULT 0,
    word TEXT,
    PRIMARY KEY (child_id, word_id)
);
ALTER TABLE public.child_vocab ENABLE ROW LEVEL SECURITY;

-- Learning Sessions
CREATE TABLE IF NOT EXISTS public.learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    session_type TEXT DEFAULT 'reading',
    book_id UUID REFERENCES public.books(id) ON DELETE SET NULL,
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    summary JSONB DEFAULT '{}'
);
ALTER TABLE public.learning_sessions ENABLE ROW LEVEL SECURITY;

-- Point Transactions
CREATE TABLE IF NOT EXISTS public.point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    amount INT,
    reason TEXT,
    session_id UUID REFERENCES public.learning_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    idempotency_key TEXT,
    owner_user_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}',
    identity_key TEXT,
    entity_id TEXT,
    entity_type TEXT,
    UNIQUE(child_id, idempotency_key)
);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    code TEXT PRIMARY KEY,
    name TEXT,
    quotas JSONB
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Feature Usage
CREATE TABLE IF NOT EXISTS public.feature_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_name TEXT,
    current_usage INT DEFAULT 0,
    max_limit INT DEFAULT 5,
    metadata JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT now(),
    owner_user_id UUID REFERENCES auth.users(id),
    reset_at TIMESTAMPTZ,
    identity_key TEXT,
    UNIQUE(identity_key, feature_name)
);
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER update_feature_usage_modtime BEFORE UPDATE ON public.feature_usage FOR EACH ROW EXECUTE PROCEDURE public.update_updated_at_column();

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id),
    identity_key TEXT,
    ip_address TEXT,
    action_type public.audit_action_type,
    entity_type public.audit_entity_type,
    entity_id TEXT,
    details JSONB DEFAULT '{}',
    status TEXT DEFAULT 'success',
    created_at TIMESTAMPTZ DEFAULT now(),
    child_id UUID REFERENCES public.children(id) ON DELETE SET NULL
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Child Magic Sentences
CREATE TABLE IF NOT EXISTS public.child_magic_sentences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    words TEXT[],
    sentence TEXT,
    audio_path TEXT,
    image_path TEXT,
    timing_path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.child_magic_sentences ENABLE ROW LEVEL SECURITY;

-- Badges
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE,
    description TEXT,
    icon_key TEXT,
    rarity TEXT DEFAULT 'basic',
    created_at TIMESTAMPTZ DEFAULT now(),
    slug TEXT UNIQUE,
    icon_path TEXT,
    criteria TEXT
);
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Child Badges
CREATE TABLE IF NOT EXISTS public.child_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(child_id, badge_id)
);
ALTER TABLE public.child_badges ENABLE ROW LEVEL SECURITY;

-- Feedbacks
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT,
    email TEXT,
    message TEXT,
    type TEXT DEFAULT 'feedback',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- 5. Functions & Triggers

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;

-- match_books
CREATE OR REPLACE FUNCTION public.match_books(
    query_embedding vector(1024),
    match_threshold double precision,
    match_count integer,
    match_offset integer DEFAULT 0,
    filter_min_grade integer DEFAULT NULL,
    filter_max_grade integer DEFAULT NULL,
    filter_category text DEFAULT NULL,
    filter_is_nonfiction boolean DEFAULT NULL,
    filter_min_duration integer DEFAULT NULL,
    filter_max_duration integer DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, description text, keywords text[], similarity double precision)
LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.title,
    b.description,
    b.keywords,
    1 - (b.embedding <=> query_embedding) AS similarity
  FROM books b
  WHERE 1 - (b.embedding <=> query_embedding) > match_threshold
  AND b.owner_user_id IS NULL  -- STRICTLY PUBLIC ONLY
  AND (filter_min_grade IS NULL OR b.min_grade >= filter_min_grade)
  AND (filter_max_grade IS NULL OR b.min_grade <= filter_max_grade)
  AND (filter_is_nonfiction IS NULL OR b.is_nonfiction = filter_is_nonfiction)
  AND (filter_category IS NULL OR filter_category = ANY(b.categories))
  AND (filter_min_duration IS NULL OR (b.estimated_reading_time IS NOT NULL AND b.estimated_reading_time >= filter_min_duration))
  AND (filter_max_duration IS NULL OR (b.estimated_reading_time IS NOT NULL AND b.estimated_reading_time <= filter_max_duration))
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$function$;

-- get_library_books
CREATE OR REPLACE FUNCTION public.get_library_books(
    p_child_id UUID,
    p_filter_owner_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_sort_by TEXT DEFAULT 'last_opened',
    p_sort_asc BOOLEAN DEFAULT FALSE,
    p_only_personal BOOLEAN DEFAULT FALSE,
    p_filter_level TEXT DEFAULT NULL,
    p_filter_origin TEXT DEFAULT NULL,
    p_filter_is_favorite BOOLEAN DEFAULT NULL,
    p_filter_category TEXT DEFAULT NULL,
    p_filter_duration TEXT DEFAULT NULL,
    p_filter_is_nonfiction BOOLEAN DEFAULT NULL,
    p_only_public BOOLEAN DEFAULT FALSE,
    p_filter_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    voice_id TEXT,
    owner_user_id UUID,
    child_id UUID,
    total_tokens INT,
    estimated_reading_time INT,
    cover_image_path TEXT,
    level TEXT,
    is_nonfiction BOOLEAN,
    origin TEXT,
    progress_is_favorite BOOLEAN,
    progress_is_completed BOOLEAN,
    progress_last_token_index INT,
    progress_last_read_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.updated_at,
        b.created_at,
        b.voice_id,
        b.owner_user_id,
        b.child_id,
        b.total_tokens,
        b.estimated_reading_time,
        b.cover_image_path,
        b.level,
        b.is_nonfiction,
        b.origin,
        cb.is_favorite AS progress_is_favorite,
        cb.is_completed AS progress_is_completed,
        cb.last_token_index AS progress_last_token_index,
        cb.last_read_at AS progress_last_read_at
    FROM 
        books b
    LEFT JOIN 
        child_books cb ON b.id = cb.book_id AND cb.child_id = p_child_id
    WHERE
        (p_filter_ids IS NULL OR b.id = ANY(p_filter_ids))
        AND
        (
            (p_only_personal IS TRUE AND (
                (p_filter_owner_id IS NOT NULL AND b.owner_user_id = p_filter_owner_id)
                AND (b.child_id IS NULL OR b.child_id = p_child_id)
            ))
            OR
            (p_only_public IS TRUE AND (
                 b.owner_user_id IS NULL
            ))
            OR
            (p_only_personal IS FALSE AND p_only_public IS FALSE AND (
                b.owner_user_id IS NULL
                OR ((p_filter_owner_id IS NOT NULL AND b.owner_user_id = p_filter_owner_id) 
                 AND (b.child_id IS NULL OR b.child_id = p_child_id))
            ))
        )
        AND (p_filter_is_favorite IS NULL OR (p_filter_is_favorite IS TRUE AND cb.is_favorite IS TRUE))
        AND (p_filter_level IS NULL OR (
            CASE 
                WHEN p_filter_level = 'toddler' THEN (b.min_grade <= -1)
                WHEN p_filter_level = 'preschool' THEN (b.min_grade = 0)
                WHEN p_filter_level = 'elementary' THEN (b.min_grade >= 1 AND b.min_grade < 3)
                WHEN p_filter_level = 'intermediate' THEN (b.min_grade >= 3)
                ELSE b.level = p_filter_level
            END
        ))
        AND (p_filter_origin IS NULL OR b.origin = p_filter_origin)
        AND (p_filter_is_nonfiction IS NULL OR b.is_nonfiction = p_filter_is_nonfiction)
        AND (p_filter_category IS NULL OR (b.categories @> ARRAY[p_filter_category]::text[]))
        AND (p_filter_duration IS NULL OR (
            CASE 
                WHEN p_filter_duration = 'short' THEN (b.estimated_reading_time < 5)
                WHEN p_filter_duration = 'medium' THEN (b.estimated_reading_time >= 5 AND b.estimated_reading_time <= 10)
                WHEN p_filter_duration = 'long' THEN (b.estimated_reading_time > 10)
                ELSE TRUE
            END
        ))
    ORDER BY
        CASE WHEN p_sort_by = 'last_opened' AND p_sort_asc THEN cb.last_read_at END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'last_opened' AND NOT p_sort_asc THEN cb.last_read_at END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_asc THEN b.created_at END ASC,
        CASE WHEN p_sort_by = 'created_at' AND NOT p_sort_asc THEN b.created_at END DESC,
        CASE WHEN p_sort_by = 'newest' AND p_sort_asc THEN b.updated_at END ASC,
        CASE WHEN p_sort_by = 'newest' AND NOT p_sort_asc THEN b.updated_at END DESC,
        CASE WHEN p_sort_by = 'title' AND p_sort_asc THEN b.title END ASC,
        CASE WHEN p_sort_by = 'title' AND NOT p_sort_asc THEN b.title END DESC,
        CASE WHEN p_sort_by = 'reading_time' AND p_sort_asc THEN b.estimated_reading_time END ASC,
        CASE WHEN p_sort_by = 'reading_time' AND NOT p_sort_asc THEN b.estimated_reading_time END DESC,
        b.title ASC,
        b.id ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- evaluate_child_badges
CREATE OR REPLACE FUNCTION public.evaluate_child_badges(
  p_child_id uuid,
  p_timezone text DEFAULT 'UTC'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_streak_count INTEGER;
  v_total_xp INTEGER;
  v_earned_badges JSONB;
  v_new_badges JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_hour INTEGER;
BEGIN
  SELECT streak_count, total_xp, COALESCE(earned_badges, '{}'::jsonb)
  INTO v_streak_count, v_total_xp, v_earned_badges
  FROM public.children
  WHERE id = p_child_id;

  v_new_badges := v_earned_badges;
  v_hour := EXTRACT(HOUR FROM v_now AT TIME ZONE p_timezone);

  IF v_streak_count >= 7 AND NOT (v_new_badges ? 'streak_hero') THEN
    v_new_badges := v_new_badges || jsonb_build_object('streak_hero', v_now);
  END IF;

  IF NOT (v_new_badges ? 'reading_ace') AND EXISTS (
    SELECT 1 FROM public.point_transactions 
    WHERE child_id = p_child_id AND reason IN ('book_completed', 'mission_completed')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('reading_ace', v_now);
  END IF;

  IF NOT (v_new_badges ? 'creation_wizard') AND (
    SELECT count(*) FROM public.point_transactions 
    WHERE child_id = p_child_id AND reason = 'story_generated'
  ) >= 5 THEN
    v_new_badges := v_new_badges || jsonb_build_object('creation_wizard', v_now);
  END IF;

  IF NOT (v_new_badges ? 'word_master') AND (
    SELECT count(*) FROM public.child_vocab WHERE child_id = p_child_id
  ) >= 50 THEN
    v_new_badges := v_new_badges || jsonb_build_object('word_master', v_now);
  END IF;

  IF NOT (v_new_badges ? 'night_owl') AND v_hour >= 20 AND EXISTS (
     SELECT 1 FROM public.point_transactions 
     WHERE child_id = p_child_id AND created_at >= (v_now - INTERVAL '5 minutes')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('night_owl', v_now);
  END IF;

  IF NOT (v_new_badges ? 'early_bird') AND v_hour < 8 AND EXISTS (
     SELECT 1 FROM public.point_transactions 
     WHERE child_id = p_child_id AND created_at >= (v_now - INTERVAL '5 minutes')
  ) THEN
    v_new_badges := v_new_badges || jsonb_build_object('early_bird', v_now);
  END IF;

  IF v_new_badges != v_earned_badges THEN
    UPDATE public.children
    SET earned_badges = v_new_badges
    WHERE id = p_child_id;
  END IF;
END;
$$;

-- claim_lumo_reward
CREATE OR REPLACE FUNCTION public.claim_lumo_reward(
  p_child_id text,
  p_key text,
  p_amount integer,
  p_reason text,
  p_entity_id text DEFAULT NULL,
  p_timezone text DEFAULT 'UTC',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_id UUID := p_child_id::UUID;
  v_last_activity TIMESTAMPTZ;
  v_streak_count INTEGER;
  v_current_total_xp INTEGER;
  v_new_total_xp INTEGER;
  v_new_level INTEGER;
  v_owner_id UUID;
  v_today DATE;
  v_yesterday DATE;
  v_last_active_date DATE;
  v_inserted_id UUID;
  v_result JSONB;
BEGIN
  SELECT last_activity_at, streak_count, COALESCE(total_xp, 0), owner_user_id
  INTO v_last_activity, v_streak_count, v_current_total_xp, v_owner_id
  FROM public.children
  WHERE id = v_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child not found');
  END IF;

  INSERT INTO public.point_transactions (
    child_id,
    owner_user_id,
    identity_key,
    amount,
    reason,
    idempotency_key,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_child_id,
    v_owner_id,
    v_owner_id::text,
    p_amount,
    p_reason,
    p_key,
    CASE 
      WHEN p_reason LIKE 'book%' OR p_reason LIKE 'mission%' THEN 'book'
      WHEN p_reason LIKE 'story%' OR p_reason LIKE 'magic%' THEN 'story'
      WHEN p_reason LIKE 'word%' THEN 'word'
      ELSE 'other'
    END,
    p_entity_id,
    p_metadata
  )
  ON CONFLICT (child_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING
  RETURNING id INTO v_inserted_id;

  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;
  v_yesterday := v_today - INTERVAL '1 day';
  v_last_active_date := (v_last_activity AT TIME ZONE p_timezone)::DATE;

  IF v_last_activity IS NULL THEN
    v_streak_count := 1;
  ELSIF v_last_active_date = v_today THEN
    -- Already active
  ELSIF v_last_active_date = v_yesterday THEN
    v_streak_count := v_streak_count + 1;
  ELSE
    v_streak_count := 1;
  END IF;

  v_new_total_xp := v_current_total_xp + COALESCE(CASE WHEN v_inserted_id IS NOT NULL THEN p_amount ELSE 0 END, 0);
  v_new_level := floor(v_new_total_xp / 1000) + 1;

  UPDATE public.children
  SET 
    total_xp = v_new_total_xp,
    level = v_new_level,
    streak_count = v_streak_count,
    last_activity_at = NOW(),
    updated_at = NOW()
  WHERE id = v_child_id;

  IF (p_reason = 'book_completed' OR p_reason = 'mission_completed') AND p_entity_id IS NOT NULL THEN
    INSERT INTO public.child_books (child_id, book_id, is_completed, last_read_at)
    VALUES (v_child_id, p_entity_id::uuid, true, NOW())
    ON CONFLICT (child_id, book_id) DO UPDATE 
    SET is_completed = true, last_read_at = EXCLUDED.last_read_at;
  END IF;

  IF v_inserted_id IS NOT NULL THEN
    INSERT INTO public.audit_logs (
      owner_user_id,
      identity_key,
      child_id,
      action_type,
      entity_type,
      entity_id,
      details,
      status
    ) 
    SELECT 
      owner_user_id,
      owner_user_id::text,
      v_child_id,
      CASE 
        WHEN p_reason = 'book_opened' THEN 'book.opened'::public.audit_action_type
        WHEN p_reason = 'book_completed' THEN 'book.completed'::public.audit_action_type
        WHEN p_reason = 'mission_completed' THEN 'book.completed'::public.audit_action_type
        WHEN p_reason = 'story_generated' THEN 'story.generated'::public.audit_action_type
        WHEN p_reason = 'magic_sentence_generated' THEN 'story.generated'::public.audit_action_type
        WHEN p_reason = 'word_insight_viewed' THEN 'word_insight.viewed'::public.audit_action_type
        WHEN p_reason = 'word_added' THEN 'word.added'::public.audit_action_type
        ELSE 'user.login'::public.audit_action_type
      END,
      CASE 
        WHEN p_reason LIKE 'book%' OR p_reason LIKE 'mission%' THEN 'book'::public.audit_entity_type
        WHEN p_reason LIKE 'story%' OR p_reason LIKE 'magic%' THEN 'story'::public.audit_entity_type
        WHEN p_reason LIKE 'word%' THEN 'word'::public.audit_entity_type
        ELSE 'child_profile'::public.audit_entity_type
      END,
      p_entity_id,
      p_metadata,
      'success'
    FROM public.children WHERE id = v_child_id;
  END IF;

  v_result := jsonb_build_object(
    'success', v_inserted_id IS NOT NULL,
    'xp_earned', CASE WHEN v_inserted_id IS NOT NULL THEN p_amount ELSE 0 END,
    'new_total_xp', v_new_total_xp,
    'new_level', v_new_level,
    'new_streak', v_streak_count,
    'is_new_day', v_last_active_date IS NULL OR v_last_active_date < v_today
  );

  PERFORM public.evaluate_child_badges(v_child_id, p_timezone);

  RETURN v_result;
END;
$$;

-- increment_batch_feature_usage
CREATE OR REPLACE FUNCTION public.increment_batch_feature_usage(
    p_identity_key TEXT,
    p_updates JSONB,
    p_owner_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    error_message TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_update JSONB;
    v_feature_name TEXT;
    v_increment INTEGER;
    v_max_limit INTEGER;
    v_current INTEGER;
    v_limit INTEGER;
    v_child_id UUID;
    v_metadata JSONB;
    v_entity_id TEXT;
    v_entity_type TEXT;
    v_idempotency_key TEXT;
BEGIN
    PERFORM 1 
    FROM public.feature_usage 
    WHERE identity_key = p_identity_key 
      AND feature_name IN (
          SELECT (value->>'feature_name') 
          FROM jsonb_array_elements(p_updates)
      )
    FOR UPDATE;

    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;

        SELECT current_usage, max_limit 
        INTO v_current, v_limit
        FROM public.feature_usage
        WHERE identity_key = p_identity_key AND feature_name = v_feature_name;

        IF NOT FOUND THEN
            v_current := 0;
            v_limit := v_max_limit;
        ELSE
            v_limit := v_max_limit; 
        END IF;

        IF v_increment > 0 AND (v_current + v_increment) > v_limit THEN
            RETURN QUERY SELECT FALSE, 'LIMIT_REACHED: ' || v_feature_name;
            RETURN;
        END IF;
    END LOOP;

    FOR v_update IN SELECT * FROM jsonb_array_elements(p_updates)
    LOOP
        v_feature_name := v_update->>'feature_name';
        v_increment := (v_update->>'increment')::INTEGER;
        v_max_limit := (v_update->>'max_limit')::INTEGER;
        v_child_id := (v_update->>'child_id')::UUID;
        v_metadata := (v_update->>'metadata')::JSONB;
        v_entity_id := v_update->>'entity_id';
        v_entity_type := v_update->>'entity_type';
        v_idempotency_key := v_update->>'idempotency_key';
        
        INSERT INTO public.feature_usage (
            owner_user_id, 
            identity_key, 
            feature_name, 
            current_usage, 
            max_limit,
            updated_at
        ) VALUES (
            p_owner_user_id,
            p_identity_key,
            v_feature_name,
            GREATEST(0, v_increment),
            v_max_limit,
            now()
        )
        ON CONFLICT (identity_key, feature_name) 
        DO UPDATE SET
            current_usage = GREATEST(0, feature_usage.current_usage + v_increment),
            max_limit = v_max_limit,
            updated_at = now();
            
        IF v_increment != 0 AND p_owner_user_id IS NOT NULL THEN
            INSERT INTO public.point_transactions (
                owner_user_id,
                child_id,
                amount,
                reason,
                metadata,
                entity_id,
                entity_type,
                idempotency_key
            ) VALUES (
                p_owner_user_id,
                v_child_id,
                -1 * v_increment,
                v_feature_name,
                COALESCE(v_metadata, '{}'::jsonb),
                v_entity_id,
                v_entity_type,
                v_idempotency_key
            );
        END IF;
    END LOOP;

    RETURN QUERY SELECT TRUE, NULL::TEXT;
END;
$$;

-- increment_feature_usage
CREATE OR REPLACE FUNCTION public.increment_feature_usage(
    p_identity_key TEXT,
    p_feature_name TEXT,
    p_max_limit INTEGER,
    p_owner_user_id UUID DEFAULT NULL,
    p_increment INTEGER DEFAULT 1
)
RETURNS TABLE (
    success BOOLEAN,
    current_count INTEGER,
    enforced_limit INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_success BOOLEAN;
    v_error TEXT;
    v_current INTEGER;
BEGIN
    SELECT r.success, r.error_message INTO v_success, v_error
    FROM public.increment_batch_feature_usage(
        p_identity_key,
        jsonb_build_array(
            jsonb_build_object(
                'feature_name', p_feature_name,
                'increment', p_increment,
                'max_limit', p_max_limit
            )
        ),
        p_owner_user_id
    ) AS r;

    SELECT current_usage INTO v_current
    FROM public.feature_usage
    WHERE identity_key = p_identity_key AND feature_name = p_feature_name;

    RETURN QUERY SELECT v_success, COALESCE(v_current, 0), p_max_limit;
END;
$$;

-- 6. Policies
-- Generic Read/Write for Owner pattern
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename NOT IN ('subscription_plans', 'badges') -- Read only / Public tables handled separately
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END LOOP;
END $$;

-- Policies
CREATE POLICY "Public read books" ON public.books FOR SELECT USING (owner_user_id IS NULL OR auth.uid() = owner_user_id);
CREATE POLICY "Owner crud books" ON public.books FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Public read book_audios" ON public.book_audios FOR SELECT USING (true);
CREATE POLICY "Owner crud book_audios" ON public.book_audios FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Public read book_media" ON public.book_media FOR SELECT USING (true);
CREATE POLICY "Owner crud book_media" ON public.book_media FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Public read word_insights" ON public.word_insights FOR SELECT USING (true);

CREATE POLICY "Owner crud stories" ON public.stories FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Owner view profiles" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Owner update profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Owner crud children" ON public.children FOR ALL USING (auth.uid() = owner_user_id);

CREATE POLICY "Owner crud child_books" ON public.child_books FOR ALL USING (EXISTS (SELECT 1 FROM children WHERE id = child_id AND owner_user_id = auth.uid()));

CREATE POLICY "Owner crud child_vocab" ON public.child_vocab FOR ALL USING (EXISTS (SELECT 1 FROM children WHERE id = child_id AND owner_user_id = auth.uid()));

CREATE POLICY "Owner view transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = owner_user_id);

CREATE POLICY "Public read plans" ON public.subscription_plans FOR SELECT USING (true);

CREATE POLICY "Owner view usage" ON public.feature_usage FOR SELECT USING (auth.uid() = owner_user_id OR identity_key = auth.uid()::text);

CREATE POLICY "Owner view magic_sentences" ON public.child_magic_sentences FOR SELECT USING (EXISTS (SELECT 1 FROM children WHERE id = child_id AND owner_user_id = auth.uid()));

CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);

CREATE POLICY "Owner view child_badges" ON public.child_badges FOR SELECT USING (EXISTS (SELECT 1 FROM children WHERE id = child_id AND owner_user_id = auth.uid()));
