-- ===========================================================
-- Migration: Create labels, videos, frames, annotations tables
-- ===========================================================

-- =====================
-- Enable pgvector extension for frame embeddings
-- =====================
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================
-- labels table
-- =====================
CREATE TABLE public.labels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#FF0000',
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, name)
);

CREATE INDEX idx_labels_project ON public.labels(project_id);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage labels in own projects"
    ON public.labels FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = labels.project_id
            AND projects.owner_id = auth.uid()
        )
    );

-- =====================
-- videos table
-- =====================
CREATE TABLE public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    s3_key TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    duration_seconds FLOAT,
    width INTEGER,
    height INTEGER,
    fps FLOAT,
    frame_count INTEGER,
    status VARCHAR(50) DEFAULT 'uploading',
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_videos_project ON public.videos(project_id);
CREATE INDEX idx_videos_status ON public.videos(status);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage videos in own projects"
    ON public.videos FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = videos.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE TRIGGER on_videos_updated
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- =====================
-- frames table
-- =====================
CREATE TABLE public.frames (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
    frame_number INTEGER NOT NULL,
    timestamp_ms INTEGER NOT NULL,
    s3_key TEXT NOT NULL,
    thumbnail_s3_key TEXT,
    width INTEGER,
    height INTEGER,
    embedding vector(768),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(video_id, frame_number)
);

CREATE INDEX idx_frames_video ON public.frames(video_id);
-- Note: ivfflat index for embeddings should be created after data is populated
-- CREATE INDEX idx_frames_embedding ON public.frames USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

ALTER TABLE public.frames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage frames in own projects"
    ON public.frames FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.videos
            JOIN public.projects ON projects.id = videos.project_id
            WHERE videos.id = frames.video_id
            AND projects.owner_id = auth.uid()
        )
    );

-- =====================
-- annotations table
-- =====================
CREATE TABLE public.annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    frame_id UUID NOT NULL REFERENCES public.frames(id) ON DELETE CASCADE,
    label_id UUID NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
    bbox_x FLOAT NOT NULL,
    bbox_y FLOAT NOT NULL,
    bbox_width FLOAT NOT NULL,
    bbox_height FLOAT NOT NULL,
    segmentation JSONB,
    confidence FLOAT,
    source VARCHAR(50) DEFAULT 'manual',
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_annotations_frame ON public.annotations(frame_id);
CREATE INDEX idx_annotations_label ON public.annotations(label_id);
CREATE INDEX idx_annotations_source ON public.annotations(source);
CREATE INDEX idx_annotations_confidence ON public.annotations(confidence);

ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage annotations in own projects"
    ON public.annotations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.frames
            JOIN public.videos ON videos.id = frames.video_id
            JOIN public.projects ON projects.id = videos.project_id
            WHERE frames.id = annotations.frame_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE TRIGGER on_annotations_updated
    BEFORE UPDATE ON public.annotations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
