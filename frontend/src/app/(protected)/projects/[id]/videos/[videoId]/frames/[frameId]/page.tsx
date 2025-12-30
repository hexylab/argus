import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchFrame, fetchLabels } from "./actions";
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

export default async function AnnotationPage({ params }: AnnotationPageProps) {
  const { id: projectId, videoId, frameId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, videoResult, frameResult, labelsResult] =
    await Promise.all([
      fetchProject(projectId),
      fetchVideo(projectId, videoId),
      fetchFrame(projectId, videoId, frameId),
      fetchLabels(projectId),
    ]);

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
  const labels = labelsResult.labels ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex-none border-b bg-background px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link
              href="/dashboard"
              className="hover:text-foreground transition-colors"
            >
              ダッシュボード
            </Link>
            <svg
              className="size-4 opacity-50"
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
            <Link
              href={`/projects/${projectId}`}
              className="hover:text-foreground transition-colors"
            >
              {project.name}
            </Link>
            <svg
              className="size-4 opacity-50"
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
            <Link
              href={`/projects/${projectId}/videos/${videoId}`}
              className="hover:text-foreground transition-colors truncate max-w-[200px]"
            >
              {video.original_filename}
            </Link>
            <svg
              className="size-4 opacity-50"
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
            <span className="text-foreground">
              フレーム {frame.frame_number}
            </span>
          </div>

          <Link href={`/projects/${projectId}/videos/${videoId}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <svg
                className="size-4"
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
              戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 min-h-0">
        <AnnotationClient frame={frame} labels={labels} />
      </div>
    </div>
  );
}
