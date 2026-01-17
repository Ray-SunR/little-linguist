-- Drop the old function versions
DROP FUNCTION IF EXISTS public.match_books(vector, double precision, integer);
DROP FUNCTION IF EXISTS public.match_books(vector, double precision, integer, boolean, uuid);
DROP FUNCTION IF EXISTS public.match_books(vector, double precision, integer, integer, boolean, uuid);

-- Create updated function with STRICT PUBLIC filtering and pagination
CREATE OR REPLACE FUNCTION public.match_books(
    query_embedding vector(1024),
    match_threshold double precision,
    match_count integer,
    match_offset integer DEFAULT 0
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
  ORDER BY b.embedding <=> query_embedding
  LIMIT match_count
  OFFSET match_offset;
END;
$function$;
