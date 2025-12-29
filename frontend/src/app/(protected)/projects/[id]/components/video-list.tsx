import { VideoCard } from "./video-card";
import type { Video } from "@/types/video";
import { cn } from "@/lib/utils";

interface VideoListProps {
  videos: Video[];
  projectId: string;
}

export function VideoList({ videos, projectId }: VideoListProps) {
  if (videos.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video, index) => (
        <VideoCard
          key={video.id}
          video={video}
          projectId={projectId}
          index={index}
        />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "rounded-xl border border-dashed py-16",
        "bg-gradient-to-b from-muted/30 to-transparent"
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div
          className={cn(
            "absolute -top-24 left-1/2 size-48 -translate-x-1/2",
            "rounded-full bg-gradient-to-b from-primary/5 to-transparent",
            "blur-2xl"
          )}
        />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-muted to-muted/50",
            "shadow-sm ring-1 ring-border"
          )}
        >
          <svg
            className="size-7 text-muted-foreground/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">
            映像がありません
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            上のエリアに映像ファイルをドラッグ&ドロップして
            <br />
            アップロードを開始しましょう
          </p>
        </div>
      </div>
    </div>
  );
}
