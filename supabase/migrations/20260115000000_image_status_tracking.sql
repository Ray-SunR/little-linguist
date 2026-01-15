-- Migration: Image Status Tracking
-- Enable Realtime for books and add status tracking logic

-- 1. Enable Realtime for books table if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'books'
  ) THEN
    INSERT INTO pg_publication_tables (pubname, schemaname, tablename)
    VALUES ('supabase_realtime', 'public', 'books')
    ON CONFLICT DO NOTHING;
    
    -- Actually we should use the ALTER PUBLICATION command for better compatibility
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE books';
  END IF;
EXCEPTION
    WHEN others THEN
        -- Handle cases where it's already added or permissions issue
        RAISE NOTICE 'Could not add table books to publication: %', SQLERRM;
END $$;

-- 2. Function to update section image status atomically
-- This updates BOTH stories.sections and books.metadata.sections
CREATE OR REPLACE FUNCTION public.update_section_image_status(
    p_book_id UUID,
    p_section_index INT,
    p_status TEXT,
    p_storage_path TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update stories table
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

    -- Update books table (Metadata sections)
    -- This triggers Realtime for the reader
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
$$;
