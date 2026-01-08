-- ===========================================================
-- Migration: Create import_jobs table and add source_type to videos
-- ===========================================================

-- =====================
-- Add source_type column to videos table
-- =====================
ALTER TABLE public.videos
ADD COLUMN source_type VARCHAR(50) DEFAULT 'video';

-- =====================
-- import_jobs table
-- =====================
CREATE TABLE public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    video_id UUID REFERENCES public.videos(id) ON DELETE SET NULL,
    format VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    progress FLOAT DEFAULT 0,
    s3_key TEXT,
    total_images INTEGER,
    processed_images INTEGER,
    total_annotations INTEGER,
    imported_annotations INTEGER,
    label_mapping JSONB,
    error_message TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_import_jobs_project ON public.import_jobs(project_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_created_by ON public.import_jobs(created_by);

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage import jobs in own projects"
    ON public.import_jobs FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            WHERE projects.id = import_jobs.project_id
            AND projects.owner_id = auth.uid()
        )
    );

CREATE TRIGGER on_import_jobs_updated
    BEFORE UPDATE ON public.import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
