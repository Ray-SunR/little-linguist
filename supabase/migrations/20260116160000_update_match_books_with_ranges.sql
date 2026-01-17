-- Drop the old function versions to avoid ambiguity
DROP FUNCTION IF EXISTS public.match_books(vector, double precision, integer, integer, text, text, boolean, text);

-- Create updated function with filtering support
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
  AND (filter_min_duration IS NULL OR b.estimated_reading_time >= filter_min_duration)
  AND (filter_max_duration IS NULL OR b.estimated_reading_time <= filter_max_duration)
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$function$;
