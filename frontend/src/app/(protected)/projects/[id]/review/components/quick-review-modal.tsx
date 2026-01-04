"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnnotationWithFrame } from "@/types/annotation-review";

interface QuickReviewModalProps {
  annotations: AnnotationWithFrame[];
  projectId: string;
  initialIndex?: number;
  onApprove: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function QuickReviewModal({
  annotations,
  projectId,
  initialIndex = 0,
  onApprove,
  onDelete,
  onClose,
}: QuickReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);

  const current = annotations[currentIndex];
  const hasNext = currentIndex < annotations.length - 1;
  const hasPrev = currentIndex > 0;

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((i) => i + 1);
      setImageError(false);
    } else {
      onClose();
    }
  }, [hasNext, onClose]);

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((i) => i - 1);
      setImageError(false);
    }
  }, [hasPrev]);

  const handleApprove = useCallback(async () => {
    if (!current || isProcessing) return;
    setIsProcessing(true);
    await onApprove(current.id);
    setIsProcessing(false);
    goNext();
  }, [current, isProcessing, onApprove, goNext]);

  const handleDelete = useCallback(async () => {
    if (!current || isProcessing) return;
    setIsProcessing(true);
    await onDelete(current.id);
    setIsProcessing(false);
    // Stay at same index (next item will shift into this position)
    if (currentIndex >= annotations.length - 1 && currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
    setImageError(false);
  }, [current, isProcessing, onDelete, currentIndex, annotations.length]);

  const handleSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      switch (e.key) {
        case "Enter":
        case "a":
          e.preventDefault();
          handleApprove();
          break;
        case "Delete":
        case "Backspace":
        case "d":
          e.preventDefault();
          handleDelete();
          break;
        case "ArrowRight":
        case "s":
          e.preventDefault();
          handleSkip();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goPrev();
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleApprove, handleDelete, handleSkip, goPrev, onClose]);

  if (!current) {
    return null;
  }

  const imageUrl = current.frame_thumbnail_s3_key
    ? `/api/storage/${current.frame_thumbnail_s3_key}`
    : current.frame_s3_key
      ? `/api/storage/${current.frame_s3_key}`
      : null;

  const getConfidenceColor = () => {
    const confidence = current.confidence ?? 0;
    if (confidence >= 0.8) return "text-emerald-500";
    if (confidence >= 0.5) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
        >
          <span className="sr-only">閉じる</span>
          <svg
            className="size-8"
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

        {/* Progress */}
        <div className="mb-4 flex items-center justify-between text-white/70 text-sm">
          <span>
            {currentIndex + 1} / {annotations.length}
          </span>
          <span className="text-xs">
            Enter=承認 / Delete=削除 / →=スキップ / Esc=閉じる
          </span>
        </div>

        {/* Main content */}
        <div className="bg-background rounded-2xl overflow-hidden shadow-2xl">
          {/* Image area */}
          <div className="relative aspect-video bg-muted">
            {imageUrl && !imageError ? (
              <Image
                src={imageUrl}
                alt={`Frame ${current.frame_number}`}
                fill
                className="object-contain"
                sizes="(max-width: 1024px) 100vw, 896px"
                onError={() => setImageError(true)}
                unoptimized
                priority
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="size-16 text-muted-foreground/30"
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

            {/* Bounding box overlay */}
            <div
              className="absolute border-3 border-dashed pointer-events-none"
              style={{
                left: `${current.bbox_x * 100}%`,
                top: `${current.bbox_y * 100}%`,
                width: `${current.bbox_width * 100}%`,
                height: `${current.bbox_height * 100}%`,
                borderColor: current.label_color,
                borderWidth: "3px",
              }}
            />

            {/* Status badge */}
            {current.reviewed ? (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-medium flex items-center gap-2">
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
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                承認済み
              </div>
            ) : null}

            {/* Navigation arrows */}
            {hasPrev ? (
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <svg
                  className="size-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 19.5L8.25 12l7.5-7.5"
                  />
                </svg>
              </button>
            ) : null}
            {hasNext ? (
              <button
                type="button"
                onClick={goNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 size-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
              >
                <svg
                  className="size-6"
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
              </button>
            ) : null}
          </div>

          {/* Info bar */}
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Label */}
              <div className="flex items-center gap-2">
                <span
                  className="size-4 rounded-full"
                  style={{ backgroundColor: current.label_color }}
                />
                <span className="font-medium">{current.label_name}</span>
              </div>

              {/* Confidence */}
              {current.confidence !== null ? (
                <span
                  className={cn("font-mono font-bold", getConfidenceColor())}
                >
                  {Math.round(current.confidence * 100)}%
                </span>
              ) : null}

              {/* Frame info */}
              <span className="text-muted-foreground text-sm">
                フレーム #{current.frame_number}
              </span>

              {/* Source */}
              {current.source === "auto" ? (
                <span className="text-blue-500 text-sm font-medium">
                  AI生成
                </span>
              ) : null}
            </div>

            {/* Edit link */}
            <Link
              href={`/projects/${projectId}/videos/${current.video_id}/frames/${current.frame_id}`}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              詳細を編集 →
            </Link>
          </div>

          {/* Action buttons */}
          <div className="px-6 py-5 bg-muted/30 border-t border-border/50 flex items-center justify-center gap-4">
            <Button
              variant="destructive"
              size="lg"
              onClick={handleDelete}
              disabled={isProcessing}
              className="w-32 gap-2"
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
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              削除
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={handleSkip}
              disabled={isProcessing}
              className="w-32 gap-2"
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
                  d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z"
                />
              </svg>
              スキップ
            </Button>

            <Button
              size="lg"
              onClick={handleApprove}
              disabled={isProcessing || current.reviewed}
              className={cn(
                "w-32 gap-2",
                "bg-gradient-to-r from-emerald-600 to-emerald-700",
                "hover:from-emerald-500 hover:to-emerald-600"
              )}
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
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              承認
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
