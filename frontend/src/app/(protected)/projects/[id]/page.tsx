import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fetchProject, fetchVideos, fetchLabels } from "./actions";
import { VideoList } from "./components/video-list";
import { DataUploader } from "./components/data-uploader";
import { cn } from "@/lib/utils";
import type { Label } from "@/types/label";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Icons

function FolderIcon({ className }: { className?: string }) {
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
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function FilmIcon({ className }: { className?: string }) {
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
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
      />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
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
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
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

// Labels Section Component
function LabelsSection({
  labels,
  projectId,
}: {
  labels: Label[];
  projectId: string;
}) {
  const hasLabels = labels.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TagIcon className="size-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">ラベル</h2>
            <p className="text-sm text-muted-foreground">
              アノテーションに使用するラベル
            </p>
          </div>
        </div>
        <Link
          href={`/projects/${projectId}/settings`}
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          {hasLabels ? "管理" : "設定"}
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>

      {hasLabels ? (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <div
              key={label.id}
              className="flex items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-sm"
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: label.color }}
              />
              <span>{label.name}</span>
            </div>
          ))}
        </div>
      ) : (
        <Link
          href={`/projects/${projectId}/settings`}
          className="group block rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-5 transition-colors hover:border-amber-400 hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/20 dark:hover:border-amber-600 dark:hover:bg-amber-950/30"
        >
          <div className="flex items-start gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/50">
              <WarningIcon className="size-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-200">
                ラベルが設定されていません
              </h3>
              <p className="mt-1 text-sm text-amber-700/80 dark:text-amber-300/80">
                アノテーションを行うには、まずラベルを設定してください。クリックして設定ページに移動します。
              </p>
            </div>
            <ChevronRightIcon className="size-5 text-amber-600 opacity-0 transition-opacity group-hover:opacity-100 dark:text-amber-400" />
          </div>
        </Link>
      )}
    </section>
  );
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, videosResult, labelsResult] = await Promise.all([
    fetchProject(projectId),
    fetchVideos(projectId),
    fetchLabels(projectId),
  ]);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const videos = videosResult.videos ?? [];
  const labels = labelsResult.labels ?? [];
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
      {/* Page Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
            <FolderIcon className="size-6 text-foreground/70" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
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
            <p className="mt-0.5 text-sm text-muted-foreground">
              作成日: {formattedDate}
            </p>
          </div>
        </div>
        {project.description ? (
          <p className="text-muted-foreground">{project.description}</p>
        ) : null}
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Labels Section */}
      <LabelsSection labels={labels} projectId={projectId} />

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Data Upload Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FilmIcon className="size-5 text-muted-foreground" />
            <div>
              <h2 className="text-lg font-semibold tracking-tight">データ</h2>
              <p className="text-sm text-muted-foreground">
                映像またはデータセット（ZIP）をドラッグ＆ドロップ
              </p>
            </div>
          </div>
          {videos.length > 0 ? (
            <span className="rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
              {videos.length} 件
            </span>
          ) : null}
        </div>

        <DataUploader projectId={projectId} existingLabels={labels} />
      </section>

      {/* Video List Section */}
      {videosResult.error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/50">
          <svg
            className="size-5 shrink-0 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {videosResult.error}
          </span>
        </div>
      ) : (
        <VideoList videos={videos} projectId={projectId} />
      )}
    </div>
  );
}
