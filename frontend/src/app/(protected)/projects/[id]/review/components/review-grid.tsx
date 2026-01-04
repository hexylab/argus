"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { AnnotationWithFrame } from "@/types/annotation-review";

interface ReviewGridProps {
  annotations: AnnotationWithFrame[];
  projectId: string;
  selectedIds: Set<string>;
  onSelectionChange: (id: string, selected: boolean) => void;
}

export function ReviewGrid({
  annotations,
  projectId,
  selectedIds,
  onSelectionChange,
}: ReviewGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {annotations.map((annotation, index) => (
        <AnnotationCard
          key={annotation.id}
          annotation={annotation}
          projectId={projectId}
          index={index}
          isSelected={selectedIds.has(annotation.id)}
          onSelectionChange={(selected) =>
            onSelectionChange(annotation.id, selected)
          }
        />
      ))}
    </div>
  );
}

interface AnnotationCardProps {
  annotation: AnnotationWithFrame;
  projectId: string;
  index: number;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

function AnnotationCard({
  annotation,
  projectId,
  index,
  isSelected,
  onSelectionChange,
}: AnnotationCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      // If clicking on the link, don't toggle selection
      if ((e.target as HTMLElement).closest("a")) {
        return;
      }
      onSelectionChange(!isSelected);
    },
    [isSelected, onSelectionChange]
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onSelectionChange(!isSelected);
    },
    [isSelected, onSelectionChange]
  );

  // Build the frame URL from s3_key or thumbnail
  const imageUrl = annotation.frame_thumbnail_s3_key
    ? `/api/storage/${annotation.frame_thumbnail_s3_key}`
    : annotation.frame_s3_key
      ? `/api/storage/${annotation.frame_s3_key}`
      : null;

  // Confidence color
  const getConfidenceColor = () => {
    const confidence = annotation.confidence ?? 0;
    if (confidence >= 0.8) return "from-emerald-600 to-emerald-700";
    if (confidence >= 0.5) return "from-amber-600 to-amber-700";
    return "from-red-600 to-red-700";
  };

  const getConfidenceBorderColor = () => {
    const confidence = annotation.confidence ?? 0;
    if (confidence >= 0.8) return "border-emerald-300 dark:border-emerald-700";
    if (confidence >= 0.5) return "border-amber-300 dark:border-amber-700";
    return "border-red-300 dark:border-red-700";
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative rounded-xl overflow-hidden cursor-pointer",
        "border-2 transition-all duration-200",
        "hover:shadow-lg hover:scale-[1.02]",
        isSelected
          ? "border-primary ring-2 ring-primary/30 scale-[1.02]"
          : cn(
              "border-border/50 hover:border-border",
              getConfidenceBorderColor()
            )
      )}
      style={{
        animationDelay: `${index * 30}ms`,
      }}
    >
      {/* Image */}
      <div className="aspect-video relative bg-muted">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={`Frame ${annotation.frame_number}`}
            fill
            className={cn(
              "object-cover transition-transform duration-300",
              isSelected ? "scale-100" : "group-hover:scale-105"
            )}
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

        {/* Bounding box overlay (normalized coordinates) */}
        <div
          className="absolute border-2 border-dashed pointer-events-none"
          style={{
            left: `${annotation.bbox_x * 100}%`,
            top: `${annotation.bbox_y * 100}%`,
            width: `${annotation.bbox_width * 100}%`,
            height: `${annotation.bbox_height * 100}%`,
            borderColor: annotation.label_color,
          }}
        />

        {/* Selection checkbox */}
        <div className="absolute top-2 left-2 z-10">
          <button
            type="button"
            onClick={handleCheckboxClick}
            className={cn(
              "size-5 rounded-md border-2 flex items-center justify-center",
              "transition-all duration-200 ease-out",
              "shadow-sm backdrop-blur-sm",
              isSelected
                ? "bg-primary border-primary scale-100"
                : "bg-white/90 dark:bg-black/50 border-white/80 dark:border-white/30 hover:border-primary/50 hover:scale-105"
            )}
          >
            {isSelected ? (
              <svg
                className="size-3 text-primary-foreground animate-in zoom-in-50 duration-150"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            ) : null}
          </button>
        </div>

        {/* Status badge */}
        <div className="absolute top-2 right-2">
          {annotation.reviewed ? (
            <div
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white",
                "shadow-md flex items-center gap-1"
              )}
            >
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              承認済み
            </div>
          ) : (
            <div
              className={cn(
                "px-2 py-1 rounded-md text-xs font-medium",
                "bg-gradient-to-br from-amber-600 to-amber-700 text-white",
                "shadow-md flex items-center gap-1"
              )}
            >
              <svg
                className="size-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              未レビュー
            </div>
          )}
        </div>

        {/* Selection overlay */}
        {isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/15 to-transparent pointer-events-none" />
        ) : null}

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center gap-2",
            "bg-gradient-to-t from-black/70 via-black/40 to-transparent",
            "opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100"
          )}
        >
          <Link
            href={`/projects/${projectId}/videos/${annotation.video_id}/frames/${annotation.frame_id}`}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full",
              "bg-white/20 backdrop-blur-sm border border-white/30",
              "hover:bg-white/30 transition-colors"
            )}
          >
            <svg
              className="size-4 text-white"
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
            <span className="text-white text-xs font-medium">編集</span>
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 bg-background">
        <div className="flex items-center justify-between gap-2">
          {/* Label */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span
              className="size-2.5 rounded-full shrink-0"
              style={{ backgroundColor: annotation.label_color }}
            />
            <span className="text-xs font-medium truncate">
              {annotation.label_name}
            </span>
          </div>

          {/* Confidence */}
          {annotation.confidence !== null && (
            <div
              className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono font-bold text-white",
                "bg-gradient-to-br shadow-sm",
                getConfidenceColor()
              )}
            >
              {Math.round(annotation.confidence * 100)}%
            </div>
          )}
        </div>

        {/* Frame info */}
        <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
          フレーム #{annotation.frame_number}
          {annotation.source === "auto" && (
            <span className="ml-1.5 text-blue-500">AI</span>
          )}
        </p>
      </div>
    </div>
  );
}

export function ReviewGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border-2 border-border/50 overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-2.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="size-2.5 rounded-full bg-muted-foreground/20" />
                <div className="h-3 w-16 bg-muted-foreground/20 rounded" />
              </div>
              <div className="h-4 w-10 bg-muted-foreground/20 rounded" />
            </div>
            <div className="h-2.5 w-20 bg-muted-foreground/10 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
