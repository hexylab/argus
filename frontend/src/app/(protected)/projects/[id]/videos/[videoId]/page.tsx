import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchVideo, fetchFrames } from "./actions";
import { fetchProject } from "../../actions";
import { VideoDetailClient } from "./video-detail-client";

interface VideoDetailPageProps {
  params: Promise<{
    id: string;
    videoId: string;
  }>;
}

export default async function VideoDetailPage({
  params,
}: VideoDetailPageProps) {
  const { id: projectId, videoId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, videoResult] = await Promise.all([
    fetchProject(projectId),
    fetchVideo(projectId, videoId),
  ]);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  if (videoResult.error || !videoResult.video) {
    notFound();
  }

  const project = projectResult.project;
  const video = videoResult.video;

  // Only fetch frames if video is ready
  const framesResult =
    video.status === "ready" ? await fetchFrames(projectId, videoId) : null;
  const frames = framesResult?.frames ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-4">
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
          <span className="text-foreground truncate max-w-xs">
            {video.original_filename}
          </span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">
              {video.original_filename}
            </h1>
            <p className="text-muted-foreground">映像の詳細情報とフレーム</p>
          </div>

          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" className="gap-2 shrink-0">
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

      {/* Content with Client-side polling */}
      <VideoDetailClient
        video={video}
        projectId={projectId}
        initialFrames={frames}
      />
    </div>
  );
}
