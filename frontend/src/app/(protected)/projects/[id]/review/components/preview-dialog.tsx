"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnotationWithFrame } from "@/types/annotation-review";

interface PreviewDialogProps {
  annotation: AnnotationWithFrame | null;
  projectId: string;
  isExcluded: boolean;
  onClose: () => void;
  onToggleExcluded: () => void;
}

export function PreviewDialog({
  annotation,
  projectId,
  isExcluded,
  onClose,
  onToggleExcluded,
}: PreviewDialogProps) {
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  // Use full image URL for preview
  const imageUrl = annotation?.frame_image_url;

  const calculateImageRect = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate how the image fits with object-contain
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imgNaturalWidth / imgNaturalHeight;

    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > containerAspect) {
      // Image is wider than container
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Image is taller than container
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    }

    setImageRect({
      left: offsetX,
      top: offsetY,
      width: displayWidth,
      height: displayHeight,
    });
  }, []);

  const handleImageLoad = useCallback(() => {
    calculateImageRect();
  }, [calculateImageRect]);

  const handleImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node && node.complete && node.naturalWidth > 0) {
        setTimeout(calculateImageRect, 0);
      }
    },
    [calculateImageRect]
  );

  // Reset state when annotation changes
  useEffect(() => {
    setImageError(false);
    setImageRect(null);
  }, [annotation?.id]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (annotation) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [annotation, onClose]);

  if (!annotation) return null;

  const confidencePercent =
    annotation.confidence != null
      ? Math.round(annotation.confidence * 100)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Dialog */}
      <div
        className={cn(
          "relative z-10 flex flex-col",
          "w-[90vw] max-w-4xl h-[85vh]",
          "bg-background rounded-xl overflow-hidden",
          "border border-border shadow-2xl"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            {/* Label badge */}
            <div
              className="flex items-center gap-2 px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${annotation.label_color}20` }}
            >
              <div
                className="size-3 rounded-full"
                style={{ backgroundColor: annotation.label_color }}
              />
              <span className="text-sm font-medium">
                {annotation.label_name}
              </span>
            </div>

            {/* Confidence score */}
            {confidencePercent != null ? (
              <span
                className={cn(
                  "text-sm font-medium px-2 py-0.5 rounded",
                  confidencePercent >= 80
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    : confidencePercent >= 50
                      ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                )}
              >
                Score: {confidencePercent}%
              </span>
            ) : null}

            {/* Frame number */}
            <span className="text-sm text-muted-foreground">
              Frame #{annotation.frame_number}
            </span>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Image area */}
        <div
          ref={containerRef}
          className="relative flex-1 bg-muted/30 overflow-hidden"
        >
          {imageUrl && !imageError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={handleImgRef}
                src={imageUrl}
                alt={`Frame ${annotation.frame_number}`}
                className="absolute inset-0 w-full h-full object-contain"
                onLoad={handleImageLoad}
                onError={() => setImageError(true)}
              />
              {/* BBox overlay */}
              {imageRect ? (
                <div
                  className="absolute border-2 pointer-events-none"
                  style={{
                    left: imageRect.left + annotation.bbox_x * imageRect.width,
                    top: imageRect.top + annotation.bbox_y * imageRect.height,
                    width: annotation.bbox_width * imageRect.width,
                    height: annotation.bbox_height * imageRect.height,
                    borderColor: annotation.label_color,
                  }}
                >
                  {/* Label tag on top of BBox */}
                  <div
                    className="absolute -top-6 left-0 px-1.5 py-0.5 text-xs font-medium text-white rounded"
                    style={{ backgroundColor: annotation.label_color }}
                  >
                    {annotation.label_name}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-muted-foreground">
                画像を読み込めません
              </span>
            </div>
          )}

          {/* Excluded overlay */}
          {isExcluded ? (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 pointer-events-none">
              <div className="size-24 rounded-full bg-red-500/80 flex items-center justify-center">
                <svg
                  className="size-16 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Button
              variant={isExcluded ? "destructive" : "outline"}
              onClick={onToggleExcluded}
              className="gap-2"
            >
              {isExcluded ? (
                <>
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
                      d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                    />
                  </svg>
                  除外を解除
                </>
              ) : (
                <>
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  除外する
                </>
              )}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/videos/${annotation.video_id}/frames/${annotation.frame_id}`}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-2 text-sm",
                "rounded-md border border-border",
                "hover:bg-muted transition-colors"
              )}
            >
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
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
              アノテーション編集
            </Link>
            <Button variant="outline" onClick={onClose}>
              閉じる
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
