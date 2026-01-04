-- ===========================================================
-- Migration: Add HNSW index and search function for pgvector
-- ===========================================================

-- =====================
-- HNSW index for frame embeddings
-- =====================
-- HNSW provides faster query performance than IVFFlat
-- and doesn't require training data
CREATE INDEX idx_frames_embedding_hnsw
    ON public.frames
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- =====================
-- Similar frame search function
-- =====================
-- SECURITY DEFINER allows bypassing RLS for internal queries
-- Caller must verify project ownership before calling
CREATE OR REPLACE FUNCTION public.search_similar_frames(
    query_embedding vector(768),
    project_id_filter UUID,
    limit_count INTEGER DEFAULT 100
)
RETURNS TABLE (
    frame_id UUID,
    video_id UUID,
    frame_number INTEGER,
    s3_key TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.video_id,
        f.frame_number,
        f.s3_key,
        (1 - (f.embedding <=> query_embedding))::FLOAT AS similarity
    FROM public.frames f
    JOIN public.videos v ON v.id = f.video_id
    WHERE v.project_id = project_id_filter
    AND f.embedding IS NOT NULL
    ORDER BY f.embedding <=> query_embedding
    LIMIT limit_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_similar_frames(vector(768), UUID, INTEGER) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.search_similar_frames IS
    'Search for frames similar to a query embedding within a project. Returns frame_id, video_id, frame_number, s3_key, and similarity score (0-1).';
