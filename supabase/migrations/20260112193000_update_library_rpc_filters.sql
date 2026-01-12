-- Drop the old function signature to avoid overloading confusion
DROP FUNCTION IF EXISTS get_library_books(UUID, UUID, INT, INT, TEXT, BOOLEAN, BOOLEAN, TEXT, TEXT, BOOLEAN);

-- Re-create with new parameters
CREATE OR REPLACE FUNCTION get_library_books(
    p_child_id UUID,
    p_filter_owner_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0,
    p_sort_by TEXT DEFAULT 'last_opened', -- 'last_opened', 'newest', 'title', 'reading_time'
    p_sort_asc BOOLEAN DEFAULT FALSE,
    p_only_personal BOOLEAN DEFAULT FALSE,
    p_filter_level TEXT DEFAULT NULL,
    p_filter_origin TEXT DEFAULT NULL,
    p_filter_is_favorite BOOLEAN DEFAULT NULL,
    p_filter_category TEXT DEFAULT NULL,
    p_filter_duration TEXT DEFAULT NULL, -- 'short', 'medium', 'long'
    p_filter_is_nonfiction BOOLEAN DEFAULT NULL
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
    -- Joined Progress Fields
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
        -- 1. Visibility Scope
        (
            -- Personal Scope (if p_only_personal is true)
            (p_only_personal IS TRUE AND (
                -- Must be owned by the user (parent)
                (p_filter_owner_id IS NOT NULL AND b.owner_user_id = p_filter_owner_id)
                AND
                -- Must be visible to this child (Shared or Private to this child)
                (b.child_id IS NULL OR b.child_id = p_child_id)
            ))
            OR
            -- Discovery Scope (if p_only_personal is false)
            (p_only_personal IS FALSE AND (
                -- Public Books
                b.owner_user_id IS NULL
                OR
                -- OR Personal Books visible to this child
                ((p_filter_owner_id IS NOT NULL AND b.owner_user_id = p_filter_owner_id) 
                 AND (b.child_id IS NULL OR b.child_id = p_child_id))
            ))
        )
        -- 2. Favorites Filter
        AND (p_filter_is_favorite IS NULL OR (p_filter_is_favorite IS TRUE AND cb.is_favorite IS TRUE))
        -- 3. Content Filters
        AND (p_filter_level IS NULL OR b.level = p_filter_level)
        AND (p_filter_origin IS NULL OR b.origin = p_filter_origin)
        -- New Filters
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
        CASE WHEN p_sort_by = 'newest' AND p_sort_asc THEN b.updated_at END ASC,
        CASE WHEN p_sort_by = 'newest' AND NOT p_sort_asc THEN b.updated_at END DESC,
        CASE WHEN p_sort_by = 'title' AND p_sort_asc THEN b.title END ASC,
        CASE WHEN p_sort_by = 'title' AND NOT p_sort_asc THEN b.title END DESC,
        CASE WHEN p_sort_by = 'reading_time' AND p_sort_asc THEN b.estimated_reading_time END ASC,
        CASE WHEN p_sort_by = 'reading_time' AND NOT p_sort_asc THEN b.estimated_reading_time END DESC,
        -- Secondary sorts for determinism
        b.title ASC,
        b.id ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;
