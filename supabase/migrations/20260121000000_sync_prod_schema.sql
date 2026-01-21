-- Migration: Sync Prod Schema
-- Description: Adds RLS policies for book_contents and audit_logs, and provides RPCs for story generation tracking.

-- 1. Add RLS for book_contents
DROP POLICY IF EXISTS "Users can read system or own book contents" ON public.book_contents;
CREATE POLICY "Users can read system or own book contents" ON public.book_contents
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.books b
        WHERE b.id = book_id
        AND (b.origin = 'system' OR b.owner_user_id IS NULL OR b.owner_user_id = auth.uid())
    )
);

-- 2. Add RLS for audit_logs
DROP POLICY IF EXISTS "Deny public read audit_logs" ON public.audit_logs;
CREATE POLICY "Deny public read audit_logs" ON public.audit_logs FOR SELECT USING (false);

DROP POLICY IF EXISTS "Deny public insert audit_logs" ON public.audit_logs;
CREATE POLICY "Deny public insert audit_logs" ON public.audit_logs FOR INSERT WITH CHECK (false);

-- 3. Add append_story_log function
CREATE OR REPLACE FUNCTION public.append_story_log(story_id uuid, new_log jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE stories
    SET generation_logs = COALESCE(generation_logs, '[]'::JSONB) || jsonb_build_array(new_log)
    WHERE id = story_id;
END;
$function$;

-- 4. Add update_section_image_status function
CREATE OR REPLACE FUNCTION public.update_section_image_status(p_book_id uuid, p_section_index integer, p_status text, p_storage_path text DEFAULT NULL::text, p_error_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE public.stories
    SET sections = (
        SELECT jsonb_agg(
            CASE 
                WHEN (ordinality - 1) = p_section_index THEN 
                    value || jsonb_build_object(
                        'image_status', p_status,
                        'storage_path', COALESCE(p_storage_path, value->>'storage_path'),
                        'error_message', COALESCE(p_error_message, value->>'error_message'),
                        'retry_count', COALESCE((value->>'retry_count')::int, 0) + (CASE WHEN p_status = 'generating' AND value->>'image_status' = 'failed' THEN 1 ELSE 0 END)
                    )
                ELSE value
            END
        )
        FROM jsonb_array_elements(sections) WITH ORDINALITY
    )
    WHERE id = p_book_id;

    UPDATE public.books
    SET metadata = metadata || jsonb_build_object(
        'sections', (
            SELECT jsonb_agg(
                CASE 
                    WHEN (ordinality - 1) = p_section_index THEN 
                        value || jsonb_build_object(
                            'image_status', p_status,
                            'storage_path', COALESCE(p_storage_path, value->>'storage_path'),
                            'retry_count', COALESCE((value->>'retry_count')::int, 0) + (CASE WHEN p_status = 'generating' AND value->>'image_status' = 'failed' THEN 1 ELSE 0 END)
                        )
                    ELSE value
                END
            )
            FROM jsonb_array_elements(metadata->'sections') WITH ORDINALITY
        )
    )
    WHERE id = p_book_id;
END;
$function$;
