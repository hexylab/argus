import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchProject, fetchVideos } from "./actions";
import { VideoList } from "./components/video-list";
import { VideoUploader } from "./components/video-uploader";
import { cn } from "@/lib/utils";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

const statusConfig = {
  active: {
    label: "アクティブ",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  archived: {
    label: "アーカイブ",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  deleted: {
    label: "削除済み",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
} as const;

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, videosResult] = await Promise.all([
    fetchProject(projectId),
    fetchVideos(projectId),
  ]);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const videos = videosResult.videos ?? [];
  const status = statusConfig[project.status];

  const formattedDate = new Date(project.created_at).toLocaleDateString(
    "ja-JP",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );

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
          <span className="text-foreground">{project.name}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {project.name}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                  status.className
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    status.dotClassName,
                    project.status === "active" && "animate-pulse"
                  )}
                />
                {status.label}
              </span>
            </div>
            {project.description ? (
              <p className="text-muted-foreground">{project.description}</p>
            ) : null}
            <p className="text-sm text-muted-foreground">
              作成日: {formattedDate}
            </p>
          </div>

          <Link href="/dashboard">
            <Button variant="outline" className="gap-2">
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

      {/* Video Upload Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">映像</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              アノテーションする映像をアップロードしてください
            </p>
          </div>
          {videos.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {videos.length} 件の映像
            </span>
          )}
        </div>

        <VideoUploader projectId={projectId} />
      </div>

      {/* Video List Section */}
      <div className="space-y-4">
        {videosResult.error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {videosResult.error}
          </div>
        ) : (
          <VideoList videos={videos} projectId={projectId} />
        )}
      </div>
    </div>
  );
}
