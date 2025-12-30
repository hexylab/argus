"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Frame } from "@/types/frame";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface FrameGridProps {
  frames: Frame[];
  projectId: string;
  videoId: string;
  isLoading?: boolean;
}

function formatTimestamp(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const millis = ms % 1000;

  return `${mins}:${secs.toString().padStart(2, "0")}.${Math.floor(millis / 100)}`;
}

interface FrameThumbnailProps {
  frame: Frame;
  projectId: string;
  videoId: string;
  index: number;
}

function FrameThumbnail({
  frame,
  projectId,
  videoId,
  index,
}: FrameThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/projects/${projectId}/videos/${videoId}/frames/${frame.id}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted/30 block",
        "transition-all duration-200 hover:shadow-md hover:border-foreground/20",
        "animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
      )}
      style={{
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        animationFillMode: "backwards",
      }}
    >
      <div className="aspect-video relative">
        {frame.thumbnail_url && !imageError ? (
          <Image
            src={frame.thumbnail_url}
            alt={`Frame ${frame.frame_number}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg
              className="size-8 text-muted-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 flex items-center justify-center gap-2"
          )}
        >
          <svg
            className="size-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
            />
          </svg>
          <span className="text-white text-sm font-medium">アノテーション</span>
        </div>
      </div>

      {/* Frame info */}
      <div className="p-2 space-y-0.5">
        <p className="text-xs font-medium truncate">
          フレーム {frame.frame_number}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTimestamp(frame.timestamp_ms)}
        </p>
      </div>
    </Link>
  );
}

function FrameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border bg-muted/30 overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-2 space-y-1">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <svg
        className="size-12 text-muted-foreground/30 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M19.125 12h1.5m0 0c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h1.5m14.25 0h1.5"
        />
      </svg>
      <p className="text-muted-foreground">フレームがありません</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        映像の処理が完了するとフレームが表示されます
      </p>
    </div>
  );
}

export function FrameGrid({
  frames,
  projectId,
  videoId,
  isLoading = false,
}: FrameGridProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">抽出フレーム</CardTitle>
          <CardDescription>映像から抽出されたフレーム一覧</CardDescription>
        </CardHeader>
        <CardContent>
          <FrameGridSkeleton />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">抽出フレーム</CardTitle>
            <CardDescription>
              フレームをクリックしてアノテーションを開始
            </CardDescription>
          </div>
          {frames.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {frames.length} フレーム
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {frames.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {frames.map((frame, index) => (
              <FrameThumbnail
                key={frame.id}
                frame={frame}
                projectId={projectId}
                videoId={videoId}
                index={index}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
