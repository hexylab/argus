"use client";

import { useEffect, useState, useCallback } from "react";
import type { Video, VideoStatus } from "@/types/video";
import { cn } from "@/lib/utils";
import { fetchVideo } from "../actions";

interface ProcessingStatusProps {
  video: Video;
  projectId: string;
  onStatusChange?: (video: Video) => void;
}

const statusConfig: Record<
  VideoStatus,
  {
    label: string;
    description: string;
    className: string;
    dotClassName: string;
    showProgress: boolean;
  }
> = {
  uploading: {
    label: "アップロード中",
    description: "映像ファイルをアップロードしています...",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dotClassName: "bg-blue-500 animate-pulse",
    showProgress: true,
  },
  processing: {
    label: "処理中",
    description: "フレームを抽出しています...",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500 animate-pulse",
    showProgress: true,
  },
  ready: {
    label: "準備完了",
    description: "映像の処理が完了しました",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
    showProgress: false,
  },
  failed: {
    label: "エラー",
    description: "処理中にエラーが発生しました",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
    showProgress: false,
  },
};

export function ProcessingStatus({
  video: initialVideo,
  projectId,
  onStatusChange,
}: ProcessingStatusProps) {
  const [video, setVideo] = useState(initialVideo);
  const [isPolling, setIsPolling] = useState(
    initialVideo.status === "uploading" || initialVideo.status === "processing"
  );

  const status = statusConfig[video.status];

  const pollStatus = useCallback(async () => {
    const result = await fetchVideo(projectId, video.id);
    if (result.video) {
      setVideo(result.video);
      onStatusChange?.(result.video);

      // Stop polling if status is terminal
      if (result.video.status === "ready" || result.video.status === "failed") {
        setIsPolling(false);
      }
    }
  }, [projectId, video.id, onStatusChange]);

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [isPolling, pollStatus]);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 space-y-3",
        status.className,
        "border-current/20"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("size-3 rounded-full shrink-0", status.dotClassName)}
        />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{status.label}</p>
          <p className="text-sm opacity-80">{status.description}</p>
        </div>
        {status.showProgress ? (
          <div className="shrink-0">
            <svg
              className="size-5 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : null}
      </div>

      {video.status === "failed" && video.error_message ? (
        <div className="text-sm bg-red-500/10 rounded p-2 border border-red-500/20">
          <p className="font-medium text-red-700 dark:text-red-300">
            エラー詳細:
          </p>
          <p className="text-red-600 dark:text-red-400 mt-1">
            {video.error_message}
          </p>
        </div>
      ) : null}
    </div>
  );
}
