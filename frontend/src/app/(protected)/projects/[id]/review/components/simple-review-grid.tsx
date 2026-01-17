"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AnnotationWithFrame } from "@/types/annotation-review";

interface SimpleReviewGridProps {
  annotations: AnnotationWithFrame[];
  excludedIds: Set<string>;
  onToggleExcluded: (id: string) => void;
  onOpenPreview: (annotation: AnnotationWithFrame) => void;
}

export function SimpleReviewGrid({
  annotations,
  excludedIds,
  onToggleExcluded,
  onOpenPreview,
}: SimpleReviewGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {annotations.map((annotation) => (
        <SimpleAnnotationCard
          key={annotation.id}
          annotation={annotation}
          isExcluded={excludedIds.has(annotation.id)}
          onToggleExcluded={() => onToggleExcluded(annotation.id)}
          onOpenPreview={() => onOpenPreview(annotation)}
        />
      ))}
    </div>
  );
}

interface SimpleAnnotationCardProps {
  annotation: AnnotationWithFrame;
  isExcluded: boolean;
  onToggleExcluded: () => void;
  onOpenPreview: () => void;
}

function SimpleAnnotationCard({
  annotation,
  isExcluded,
  onToggleExcluded,
  onOpenPreview,
}: SimpleAnnotationCardProps) {
  const [imageError, setImageError] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

  const imageUrl = annotation.frame_thumbnail_url || annotation.frame_image_url;

  const calculateImageRect = useCallback(() => {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;

    // Calculate how the image fits with object-cover
    const containerAspect = containerWidth / containerHeight;
    const imageAspect = imgNaturalWidth / imgNaturalHeight;

    let displayWidth: number;
    let displayHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (imageAspect > containerAspect) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * imageAspect;
      offsetX = (containerWidth - displayWidth) / 2;
      offsetY = 0;
    } else {
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
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

  // Format confidence as percentage
  const confidencePercent =
    annotation.confidence != null
      ? Math.round(annotation.confidence * 100)
      : null;

  return (
    <div className="relative group flex flex-col">
      {/* Image button */}
      <button
        type="button"
        onClick={onToggleExcluded}
        className={cn(
          "relative w-full aspect-video rounded-t-lg overflow-hidden",
          "border-2 border-b-0 transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-primary/50",
          isExcluded
            ? "border-red-500 opacity-60"
            : "border-border hover:border-primary/50"
        )}
      >
        {/* Image container */}
        <div ref={containerRef} className="absolute inset-0 overflow-hidden">
          {imageUrl && !imageError ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={handleImgRef}
                src={imageUrl}
                alt={`Frame ${annotation.frame_number}`}
                className="absolute inset-0 w-full h-full object-cover"
                onLoad={handleImageLoad}
                onError={() => setImageError(true)}
              />
              {/* BBox overlay */}
              {imageRect ? (
                <div
                  className="absolute border-2 border-solid pointer-events-none"
                  style={{
                    left: imageRect.left + annotation.bbox_x * imageRect.width,
                    top: imageRect.top + annotation.bbox_y * imageRect.height,
                    width: annotation.bbox_width * imageRect.width,
                    height: annotation.bbox_height * imageRect.height,
                    borderColor: annotation.label_color,
                  }}
                />
              ) : null}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <span className="text-xs text-muted-foreground">
                {annotation.frame_number}
              </span>
            </div>
          )}
        </div>

        {/* Excluded overlay */}
        {isExcluded ? (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <div className="size-10 rounded-full bg-red-500 flex items-center justify-center">
              <svg
                className="size-6 text-white"
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
      </button>

      {/* Label info bar */}
      <div
        className={cn(
          "flex items-center justify-between px-2 py-1.5 rounded-b-lg",
          "border-2 border-t-0",
          isExcluded ? "border-red-500 opacity-60" : "border-border"
        )}
        style={{
          backgroundColor: `${annotation.label_color}15`,
        }}
      >
        {/* Label badge */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: annotation.label_color }}
          />
          <span className="text-xs font-medium truncate">
            {annotation.label_name}
          </span>
        </div>

        {/* Confidence score */}
        {confidencePercent != null ? (
          <span
            className={cn(
              "text-[10px] font-medium px-1.5 py-0.5 rounded ml-1 shrink-0",
              confidencePercent >= 80
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : confidencePercent >= 50
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {confidencePercent}%
          </span>
        ) : null}
      </div>

      {/* Preview button (top-right, on hover) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPreview();
        }}
        className={cn(
          "absolute top-1 right-1 p-1.5 rounded",
          "bg-black/60 text-white",
          "opacity-0 group-hover:opacity-100 transition-opacity",
          "hover:bg-black/80"
        )}
        title="拡大表示"
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
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
          />
        </svg>
      </button>
    </div>
  );
}
