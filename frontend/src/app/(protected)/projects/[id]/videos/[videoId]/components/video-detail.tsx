"use client";

import { useState, useEffect } from "react";
import type { Video } from "@/types/video";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface VideoDetailProps {
  video: Video;
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "-";
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "-";

  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoDetail({ video: initialVideo }: VideoDetailProps) {
  const [video, setVideo] = useState(initialVideo);
  const [formattedDate, setFormattedDate] = useState<string>("");

  // Update video when prop changes (from polling)
  useEffect(() => {
    setVideo(initialVideo);
  }, [initialVideo]);

  // Format date on client side only to avoid hydration mismatch
  useEffect(() => {
    setFormattedDate(
      new Date(video.created_at).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [video.created_at]);

  const details = [
    {
      label: "ファイル名",
      value: video.original_filename,
    },
    {
      label: "ファイルサイズ",
      value: formatFileSize(video.file_size),
    },
    {
      label: "再生時間",
      value: formatDuration(video.duration_seconds),
    },
    {
      label: "解像度",
      value:
        video.width !== null && video.height !== null
          ? `${video.width} x ${video.height}`
          : "-",
    },
    {
      label: "フレームレート",
      value: video.fps !== null ? `${video.fps.toFixed(2)} fps` : "-",
    },
    {
      label: "フレーム数",
      value: video.frame_count !== null ? `${video.frame_count} フレーム` : "-",
    },
    {
      label: "MIME タイプ",
      value: video.mime_type ?? "-",
    },
    {
      label: "アップロード日時",
      value: formattedDate || "-",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">映像情報</CardTitle>
        <CardDescription>映像ファイルの詳細情報</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {details.map((item) => (
            <div key={item.label} className="space-y-1">
              <dt className="text-sm font-medium text-muted-foreground">
                {item.label}
              </dt>
              <dd className="text-sm">{item.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
