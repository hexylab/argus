import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  fetchFrame,
  fetchLabels,
  fetchAllFrames,
  fetchAnnotations,
} from "./actions";
import { fetchVideo } from "../../actions";
import { fetchProject } from "../../../../actions";
import { AnnotationClient } from "./annotation-client";

interface AnnotationPageProps {
  params: Promise<{
    id: string;
    videoId: string;
    frameId: string;
  }>;
}

// Icons
function ChevronRight({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
      />
    </svg>
  );
}

function FrameIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

export default async function AnnotationPage({ params }: AnnotationPageProps) {
  const { id: projectId, videoId, frameId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch all required data in parallel
  const [projectResult, videoResult, frameResult, framesResult, labelsResult] =
    await Promise.all([
      fetchProject(projectId),
      fetchVideo(projectId, videoId),
      fetchFrame(projectId, videoId, frameId),
      fetchAllFrames(projectId, videoId),
      fetchLabels(projectId),
    ]);

  // Fetch annotations separately (depends on frame existing)
  const annotationsResult = await fetchAnnotations(projectId, videoId, frameId);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  if (videoResult.error || !videoResult.video) {
    notFound();
  }

  if (frameResult.error || !frameResult.frame) {
    notFound();
  }

  const project = projectResult.project;
  const video = videoResult.video;
  const frame = frameResult.frame;
  const frames = framesResult.frames ?? [];
  const labels = labelsResult.labels ?? [];
  const annotations = annotationsResult.annotations ?? [];

  // Annotation page uses full height with no padding and no scrollbar
  return (
    <div className="-m-6 lg:-m-8 flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-none border-b bg-background/95 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-sm">
            <Link
              href="/dashboard"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              ダッシュボード
            </Link>
            <ChevronRight className="size-4 text-muted-foreground/50" />
            <Link
              href={`/projects/${projectId}`}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {project.name}
            </Link>
            <ChevronRight className="size-4 text-muted-foreground/50" />
            <Link
              href={`/projects/${projectId}/videos/${videoId}`}
              className="max-w-[200px] truncate text-muted-foreground transition-colors hover:text-foreground"
            >
              {video.original_filename}
            </Link>
            <ChevronRight className="size-4 text-muted-foreground/50" />
            <div className="flex items-center gap-1.5">
              <FrameIcon className="size-4 text-foreground/70" />
              <span className="font-medium text-foreground">
                フレーム {frame.frame_number}
              </span>
            </div>
          </nav>

          <Link href={`/projects/${projectId}/videos/${videoId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeftIcon className="size-4" />
              戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="min-h-0 flex-1">
        <AnnotationClient
          frame={frame}
          frames={frames}
          labels={labels}
          initialAnnotations={annotations}
          projectId={projectId}
          videoId={videoId}
        />
      </div>
    </div>
  );
}
