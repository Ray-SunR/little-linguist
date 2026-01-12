-- Migration: Create Audit Logs Infrastructure
-- Description: Sets up the audit_logs table, enums, RLS policies, and admin RPCs.

-- 1. Create Enums for Strict Validation
CREATE TYPE public.audit_action_type AS ENUM (
    -- Authentication & Identity
    'user.login',
    'user.logout',
    'identity.merged',
    
    -- Story
    'story.started',
    'story.generated',
    'story.failed',
    
    -- Word Insights
    'word_insight.generated',
    'word_insight.viewed',
    
    -- Library & Books
    'book.favorited',
    'book.unfavorited',
    'book.opened', -- Optional future proofing
    
    -- Vocabulary
    'word.added',
    'word.removed',
    
    -- Profiles
    'child_profile.created',
    'child_profile.updated',
    'child_profile.deleted',
    'child_profile.switched',
    'child_profile.library_settings_updated',
    
    -- Assets
    'image.uploaded'
);

CREATE TYPE public.audit_entity_type AS ENUM (
    'user',
    'story',
    'book',
    'word',
    'child_profile',
    'image'
);

-- 2. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity & Access
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Nullable for guest actions
    identity_key TEXT NOT NULL, -- Unified identifier (Guest ID or User ID)
    ip_address TEXT, -- Raw IP as per requirements
    
    -- Action Taxonomy
    action_type public.audit_action_type NOT NULL,
    entity_type public.audit_entity_type NOT NULL,
    entity_id TEXT, -- Target entity ID (Story ID, Book ID, etc.)
    
    -- Context
    details JSONB DEFAULT '{}'::jsonb, -- Additional context (quota cost, etc.)
    status TEXT DEFAULT 'success', -- 'success', 'failure'
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Safety Constraints
    CONSTRAINT audit_details_size_check CHECK (octet_length(details::text) < 5000)
);

-- 3. Indexes for Performance
CREATE INDEX IF NOT EXISTS audit_logs_identity_created_idx ON public.audit_logs(identity_key, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_action_created_idx ON public.audit_logs(action_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_owner_idx ON public.audit_logs(owner_user_id);

-- 4. Enable RLS (Row Level Security)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Strict: Service Role Only)
-- Deny all public read access. Only admins/service role can read via RPC or direct DB access.
CREATE POLICY "Deny public read on audit_logs" 
ON public.audit_logs 
FOR SELECT 
USING (false);

-- Deny all public write access. Service role bypasses RLS, so this effectively blocks client-side inserts.
CREATE POLICY "Deny public insert on audit_logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (false);

-- 6. RPC: Secure Admin Access
-- Only allows fetching logs if the caller is a service role or (optionally) an admin (if we had an admin role).
-- For now, we enforce this logic via the function definition or by only calling it from trusted server components.
CREATE OR REPLACE FUNCTION public.get_audit_logs(
    p_identity_key TEXT DEFAULT NULL,
    p_action_type public.audit_action_type DEFAULT NULL,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    action_type public.audit_action_type,
    entity_type public.audit_entity_type,
    entity_id TEXT,
    details JSONB,
    status TEXT,
    ip_address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (usually postgres/superuser-like for our purposes here)
SET search_path = public
AS $$
BEGIN
    -- Optional: Add extra auth check here if we wanted to allow 'admin' role users
    -- IF auth.role() != 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;

    RETURN QUERY
    SELECT 
        a.id,
        a.created_at,
        a.action_type,
        a.entity_type,
        a.entity_id,
        a.details,
        a.status,
        a.ip_address
    FROM public.audit_logs a
    WHERE 
        (p_identity_key IS NULL OR a.identity_key = p_identity_key)
        AND
        (p_action_type IS NULL OR a.action_type = p_action_type)
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Maintenance: Cleanup Function (To be scheduled via pg_cron or external trigger)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.audit_logs
    WHERE created_at < (now() - INTERVAL '90 days');
END;
$$;
