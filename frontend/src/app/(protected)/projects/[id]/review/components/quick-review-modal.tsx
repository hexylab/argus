"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QuickReviewEditCanvas } from "./quick-review-edit-canvas";
import type {
  AnnotationWithFrame,
  AnnotationUpdateRequest,
} from "@/types/annotation-review";
import type { Label } from "@/types/label";

interface QuickReviewModalProps {
  annotations: AnnotationWithFrame[];
  projectId: string;
  labels: Label[];
  initialIndex?: number;
  onApprove: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (
    annotation: AnnotationWithFrame,
    data: AnnotationUpdateRequest
  ) => Promise<void>;
  onClose: () => void;
}

interface EditableBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  labelId: string;
  labelName: string;
  labelColor: string;
}

// Icons
function EditIcon({ className }: { className?: string }) {
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
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

// Component for displaying image with correctly positioned BBox overlay
interface ImageWithBBoxProps {
  imageUrl: string;
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
  };
  onError: () => void;
}

function ImageWithBBox({ imageUrl, bbox, onError }: ImageWithBBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imageRect, setImageRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);

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
      // Image is wider - fit to width
      displayWidth = containerWidth;
      displayHeight = containerWidth / imageAspect;
      offsetX = 0;
      offsetY = (containerHeight - displayHeight) / 2;
    } else {
      // Image is taller - fit to height
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

  // Recalculate on mount in case image is already cached
  const handleImgRef = useCallback(
    (node: HTMLImageElement | null) => {
      imgRef.current = node;
      if (node && node.complete && node.naturalWidth > 0) {
        // Image already loaded (cached)
        setTimeout(calculateImageRect, 0);
      }
    },
    [calculateImageRect]
  );

  return (
    <div ref={containerRef} className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={handleImgRef}
        src={imageUrl}
        alt="Frame"
        className="absolute inset-0 w-full h-full object-contain"
        onLoad={handleImageLoad}
        onError={onError}
      />
      {/* BBox overlay positioned relative to actual image display */}
      {imageRect ? (
        <div
          className="absolute border-3 border-dashed pointer-events-none"
          style={{
            left: imageRect.left + bbox.x * imageRect.width,
            top: imageRect.top + bbox.y * imageRect.height,
            width: bbox.width * imageRect.width,
            height: bbox.height * imageRect.height,
            borderColor: bbox.color,
            borderWidth: "3px",
          }}
        />
      ) : null}
    </div>
  );
}

export function QuickReviewModal({
  annotations,
  projectId,
  labels,
  initialIndex = 0,
  onApprove,
  onDelete,
  onUpdate,
  onClose,
}: QuickReviewModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBBox, setEditedBBox] = useState<EditableBBox | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Track original bbox to detect changes
  const originalBBoxRef = useRef<EditableBBox | null>(null);

  const current = annotations[currentIndex];
  const hasNext = currentIndex < annotations.length - 1;
  const hasPrev = currentIndex > 0;

  // Initialize edited bbox when entering edit mode
  const startEditing = useCallback(() => {
    if (!current) return;
    const bbox: EditableBBox = {
      x: current.bbox_x,
      y: current.bbox_y,
      width: current.bbox_width,
      height: current.bbox_height,
      labelId: current.label_id,
      labelName: current.label_name,
      labelColor: current.label_color,
    };
    setEditedBBox(bbox);
    originalBBoxRef.current = { ...bbox };
    setIsEditing(true);
    setHasChanges(false);
  }, [current]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedBBox(null);
    originalBBoxRef.current = null;
    setHasChanges(false);
  }, []);

  // Save changes
  const saveChanges = useCallback(async () => {
    if (!current || !editedBBox || !hasChanges) {
      cancelEditing();
      return;
    }

    setIsProcessing(true);
    await onUpdate(current, {
      bbox_x: editedBBox.x,
      bbox_y: editedBBox.y,
      bbox_width: editedBBox.width,
      bbox_height: editedBBox.height,
      label_id: editedBBox.labelId,
    });
    setIsProcessing(false);
    cancelEditing();
  }, [current, editedBBox, hasChanges, onUpdate, cancelEditing]);

  // Handle bbox change from canvas
  const handleBBoxChange = useCallback((bbox: EditableBBox) => {
    setEditedBBox(bbox);
    // Check if there are actual changes
    const original = originalBBoxRef.current;
    if (original) {
      const changed =
        Math.abs(bbox.x - original.x) > 0.001 ||
        Math.abs(bbox.y - original.y) > 0.001 ||
        Math.abs(bbox.width - original.width) > 0.001 ||
        Math.abs(bbox.height - original.height) > 0.001 ||
        bbox.labelId !== original.labelId;
      setHasChanges(changed);
    }
  }, []);

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((i) => i + 1);
      setImageError(false);
      cancelEditing();
    } else {
      onClose();
    }
  }, [hasNext, onClose, cancelEditing]);

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((i) => i - 1);
      setImageError(false);
      cancelEditing();
    }
  }, [hasPrev, cancelEditing]);

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
    cancelEditing();
  }, [
    current,
    isProcessing,
    onDelete,
    currentIndex,
    annotations.length,
    cancelEditing,
  ]);

  const handleSkip = useCallback(() => {
    goNext();
  }, [goNext]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      // Edit mode specific shortcuts
      if (isEditing) {
        switch (e.key) {
          case "Escape":
            e.preventDefault();
            cancelEditing();
            break;
          case "Enter":
            e.preventDefault();
            saveChanges();
            break;
          // Arrow keys are handled by the canvas component
        }
        return;
      }

      // Normal mode shortcuts
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
        case "e":
          e.preventDefault();
          startEditing();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isEditing,
    handleApprove,
    handleDelete,
    handleSkip,
    goPrev,
    onClose,
    startEditing,
    cancelEditing,
    saveChanges,
  ]);

  if (!current) {
    return null;
  }

  // Use presigned URL from API - prefer full image for modal view
  const imageUrl = current.frame_image_url || current.frame_thumbnail_url;

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
        onClick={isEditing ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-4xl mx-4">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors"
          disabled={isEditing}
        >
          <span className="sr-only">閉じる</span>
          <XIcon className="size-8" />
        </button>

        {/* Progress */}
        <div className="mb-4 flex items-center justify-between text-white/70 text-sm">
          <span>
            {currentIndex + 1} / {annotations.length}
          </span>
          <span className="text-xs">
            {isEditing
              ? "Enter=保存 / Esc=キャンセル / 矢印キー=微調整"
              : "E=編集 / Enter=承認 / Delete=削除 / →=スキップ / Esc=閉じる"}
          </span>
        </div>

        {/* Main content */}
        <div className="bg-background rounded-2xl overflow-hidden shadow-2xl">
          {/* Image/Edit area */}
          <div className="relative aspect-video bg-muted">
            {isEditing && editedBBox && imageUrl ? (
              // Edit mode: show canvas
              <QuickReviewEditCanvas
                imageUrl={imageUrl}
                bbox={editedBBox}
                labels={labels}
                onChange={handleBBoxChange}
              />
            ) : imageUrl && !imageError ? (
              // View mode: show image with overlay
              <ImageWithBBox
                imageUrl={imageUrl}
                bbox={{
                  x: current.bbox_x,
                  y: current.bbox_y,
                  width: current.bbox_width,
                  height: current.bbox_height,
                  color: current.label_color,
                }}
                onError={() => setImageError(true)}
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

            {/* Status badge */}
            {current.reviewed && !isEditing ? (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-emerald-600 text-white text-sm font-medium flex items-center gap-2">
                <CheckIcon className="size-4" />
                承認済み
              </div>
            ) : null}

            {/* Edit mode badge */}
            {isEditing ? (
              <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium flex items-center gap-2">
                <EditIcon className="size-4" />
                編集中
              </div>
            ) : null}

            {/* Navigation arrows (hide in edit mode) */}
            {!isEditing && hasPrev ? (
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
            {!isEditing && hasNext ? (
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

              {/* Has changes indicator */}
              {isEditing && hasChanges ? (
                <span className="text-amber-500 text-sm font-medium">
                  変更あり
                </span>
              ) : null}
            </div>

            {/* Edit link (hide in edit mode) */}
            {!isEditing ? (
              <Link
                href={`/projects/${projectId}/videos/${current.video_id}/frames/${current.frame_id}`}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                詳細を編集 →
              </Link>
            ) : null}
          </div>

          {/* Action buttons */}
          <div className="px-6 py-5 bg-muted/30 border-t border-border/50 flex items-center justify-center gap-4">
            {isEditing ? (
              // Edit mode actions
              <>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={cancelEditing}
                  disabled={isProcessing}
                  className="w-32 gap-2"
                >
                  <XIcon className="size-5" />
                  キャンセル
                </Button>
                <Button
                  size="lg"
                  onClick={saveChanges}
                  disabled={isProcessing || !hasChanges}
                  className={cn(
                    "w-32 gap-2",
                    "bg-gradient-to-r from-blue-600 to-blue-700",
                    "hover:from-blue-500 hover:to-blue-600"
                  )}
                >
                  <CheckIcon className="size-5" />
                  保存
                </Button>
              </>
            ) : (
              // Normal mode actions
              <>
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
                  onClick={startEditing}
                  disabled={isProcessing}
                  className="w-32 gap-2"
                >
                  <EditIcon className="size-5" />
                  編集
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
                  <CheckIcon className="size-5" />
                  承認
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
