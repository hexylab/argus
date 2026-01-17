"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { FrameDetail, Frame } from "@/types/frame";
import type { Label } from "@/types/label";
import type { BoundingBoxData } from "@/types/annotation";
import type { NormalizedAnnotation } from "@/components/annotation/AnnotationCanvas";
import { LabelSidebar } from "./components/label-sidebar";
import { SaveIndicator, type SaveStatus } from "./components/save-indicator";
import { saveAnnotationsAction, fetchFrameWithAnnotations } from "./actions";
import { useFramePreloader } from "./hooks/useFramePreloader";

const AnnotationCanvas = dynamic(
  () =>
    import("@/components/annotation/AnnotationCanvas").then(
      (mod) => mod.AnnotationCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="size-8 animate-spin text-muted-foreground"
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
          <span className="text-sm text-muted-foreground">
            キャンバスを読み込み中...
          </span>
        </div>
      </div>
    ),
  }
);

// Server annotation type (from API)
interface ServerAnnotation {
  id: string;
  label_id: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  source?: string;
}

interface AnnotationClientProps {
  frame: FrameDetail;
  frames: Frame[];
  labels: Label[];
  initialAnnotations: ServerAnnotation[];
  projectId: string;
  videoId: string;
}

function convertToNormalizedCoords(
  bbox: BoundingBoxData,
  imageWidth: number,
  imageHeight: number
) {
  return {
    label_id: bbox.labelId,
    bbox_x: bbox.x / imageWidth,
    bbox_y: bbox.y / imageHeight,
    bbox_width: bbox.width / imageWidth,
    bbox_height: bbox.height / imageHeight,
    source: "manual" as const,
  };
}

// Convert server annotations to the format expected by AnnotationCanvas
function toNormalizedAnnotations(
  annotations: ServerAnnotation[]
): NormalizedAnnotation[] {
  return annotations.map((a) => ({
    id: a.id,
    label_id: a.label_id,
    bbox_x: a.bbox_x,
    bbox_y: a.bbox_y,
    bbox_width: a.bbox_width,
    bbox_height: a.bbox_height,
  }));
}

export function AnnotationClient({
  frame: initialFrame,
  frames,
  labels,
  initialAnnotations,
  projectId,
  videoId,
}: AnnotationClientProps) {
  const router = useRouter();

  // Current frame state (can be updated client-side)
  const [currentFrame, setCurrentFrame] = useState<FrameDetail>(initialFrame);
  const [currentAnnotationsRaw, setCurrentAnnotationsRaw] =
    useState<ServerAnnotation[]>(initialAnnotations);

  // Track the initial frame ID to detect prop changes
  const initialFrameIdRef = useRef(initialFrame.id);

  // Update state when navigating via router (props change)
  useEffect(() => {
    if (initialFrame.id !== initialFrameIdRef.current) {
      initialFrameIdRef.current = initialFrame.id;
      setCurrentFrame(initialFrame);
      setCurrentAnnotationsRaw(initialAnnotations);
    }
  }, [initialFrame, initialAnnotations]);

  // Actual image dimensions (set by AnnotationCanvas after image loads)
  const [actualImageDimensions, setActualImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Convert server annotations to normalized format for AnnotationCanvas
  const normalizedAnnotations = useMemo(
    () => toNormalizedAnnotations(currentAnnotationsRaw),
    [currentAnnotationsRaw]
  );

  const [annotations, setAnnotations] = useState<BoundingBoxData[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(
    labels[0]?.id ?? null
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isSaving, setIsSaving] = useState(false);

  const lastSavedRef = useRef<string>("[]");
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentFrameIdRef = useRef(currentFrame.id);

  // Reset dimensions when frame changes
  useEffect(() => {
    if (currentFrame.id !== currentFrameIdRef.current) {
      currentFrameIdRef.current = currentFrame.id;
      setActualImageDimensions(null);
      setAnnotations([]);
      lastSavedRef.current = "[]";
      setSaveStatus("saved");
    }
  }, [currentFrame.id]);

  // Handle image dimensions from AnnotationCanvas
  const handleImageDimensionsChange = useCallback(
    (width: number, height: number) => {
      setActualImageDimensions({ width, height });
    },
    []
  );

  // Frame preloader
  const { getPreloadedFrame, isPreloaded } = useFramePreloader({
    frames,
    currentFrameId: currentFrame.id,
    projectId,
    videoId,
    fetchFrameData: fetchFrameWithAnnotations,
  });

  // Calculate annotation counts per label
  const annotationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ann of annotations) {
      counts[ann.labelId] = (counts[ann.labelId] ?? 0) + 1;
    }
    return counts;
  }, [annotations]);

  // Check if there are unsaved changes
  useEffect(() => {
    const current = JSON.stringify(annotations);
    if (current !== lastSavedRef.current && !isSaving) {
      setSaveStatus("unsaved");
    }
  }, [annotations, isSaving]);

  // Save function
  const save = useCallback(async () => {
    if (isSaving) return;

    // Can't save without knowing actual image dimensions
    if (!actualImageDimensions) {
      console.warn("Cannot save: image dimensions not yet known");
      return;
    }

    const current = JSON.stringify(annotations);
    if (current === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const normalizedAnns = annotations.map((bbox) =>
        convertToNormalizedCoords(
          bbox,
          actualImageDimensions.width,
          actualImageDimensions.height
        )
      );

      const result = await saveAnnotationsAction(
        projectId,
        videoId,
        currentFrame.id,
        normalizedAnns
      );

      if (result.error) {
        console.error("Save failed:", result.error);
        setSaveStatus("error");
      } else {
        lastSavedRef.current = current;
        setSaveStatus("saved");
      }
    } catch (error) {
      console.error("Save failed:", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  }, [
    annotations,
    actualImageDimensions,
    projectId,
    videoId,
    currentFrame.id,
    isSaving,
  ]);

  // Auto-save with debounce
  useEffect(() => {
    const current = JSON.stringify(annotations);
    if (current === lastSavedRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      save();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [annotations, save]);

  // Navigate to a frame (client-side if preloaded, router otherwise)
  const navigateToFrame = useCallback(
    (frameId: string) => {
      if (frameId === currentFrame.id) return;

      // Trigger save in background (don't wait)
      if (saveStatus === "unsaved") {
        save();
      }

      const preloaded = getPreloadedFrame(frameId);
      if (preloaded) {
        // Client-side navigation with preloaded data - instant switch
        setCurrentFrame(preloaded.frame);
        setCurrentAnnotationsRaw(preloaded.annotations);

        // Update URL without full navigation
        const newUrl = `/projects/${projectId}/videos/${videoId}/frames/${frameId}`;
        window.history.pushState(null, "", newUrl);
      } else {
        // Fallback to router navigation
        router.push(
          `/projects/${projectId}/videos/${videoId}/frames/${frameId}`
        );
      }
    },
    [
      currentFrame.id,
      saveStatus,
      save,
      getPreloadedFrame,
      projectId,
      videoId,
      router,
    ]
  );

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      // Extract frameId from current URL
      const pathParts = window.location.pathname.split("/");
      const frameId = pathParts[pathParts.length - 1];

      if (frameId && frameId !== currentFrame.id) {
        const preloaded = getPreloadedFrame(frameId);
        if (preloaded) {
          setCurrentFrame(preloaded.frame);
          setCurrentAnnotationsRaw(preloaded.annotations);
        } else {
          // Need to reload the page to get fresh data
          router.refresh();
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [currentFrame.id, getPreloadedFrame, router]);

  // Keyboard shortcuts for save and label selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        save();
        return;
      }

      // Number keys 1-9 to select label
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 9 && num <= labels.length) {
          setSelectedLabelId(labels[num - 1].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [save, labels]);

  // Handle annotation changes from canvas
  const handleAnnotationsChange = useCallback(
    (newAnnotations: BoundingBoxData[]) => {
      setAnnotations(newAnnotations);
    },
    []
  );

  // Handle label selection from sidebar
  const handleLabelSelect = useCallback((labelId: string) => {
    setSelectedLabelId(labelId);
  }, []);

  // Get current frame index for navigator
  const currentIndex = frames.findIndex((f) => f.id === currentFrame.id);

  return (
    <div className="flex flex-col h-full">
      {/* Unified top bar: Navigator + Frame strip + Save indicator */}
      <div className="flex-none border-b bg-background px-2 py-1">
        <div className="flex items-center gap-2">
          <FrameNavigatorClient
            frames={frames}
            currentIndex={currentIndex}
            disabled={isSaving}
            onNavigate={navigateToFrame}
            isPreloaded={isPreloaded}
          />
          <div className="flex-1 min-w-0">
            <FrameStripClient
              frames={frames}
              currentFrameId={currentFrame.id}
              onNavigate={navigateToFrame}
              isPreloaded={isPreloaded}
            />
          </div>
          <SaveIndicator status={saveStatus} onSave={save} />
        </div>
      </div>

      {/* Main content: Canvas + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 min-w-0">
          <AnnotationCanvas
            key={currentFrame.id}
            imageUrl={currentFrame.image_url}
            initialWidth={currentFrame.width ?? undefined}
            initialHeight={currentFrame.height ?? undefined}
            labels={labels}
            normalizedAnnotations={normalizedAnnotations}
            onChange={handleAnnotationsChange}
            onImageDimensionsChange={handleImageDimensionsChange}
            selectedLabelId={selectedLabelId}
          />
        </div>

        {/* Sidebar */}
        <div className="w-48 flex-none border-l bg-background overflow-y-auto">
          <LabelSidebar
            labels={labels}
            selectedLabelId={selectedLabelId}
            onLabelSelect={handleLabelSelect}
            annotationCounts={annotationCounts}
          />
        </div>
      </div>
    </div>
  );
}

// Client-side Frame Navigator that uses callback instead of router
interface FrameNavigatorClientProps {
  frames: Frame[];
  currentIndex: number;
  disabled: boolean;
  onNavigate: (frameId: string) => void;
  isPreloaded: (frameId: string) => boolean;
}

function FrameNavigatorClient({
  frames,
  currentIndex,
  disabled,
  onNavigate,
  isPreloaded,
}: FrameNavigatorClientProps) {
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < frames.length - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious && !disabled) {
      onNavigate(frames[currentIndex - 1].id);
    }
  }, [hasPrevious, disabled, onNavigate, frames, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext && !disabled) {
      onNavigate(frames[currentIndex + 1].id);
    }
  }, [hasNext, disabled, onNavigate, frames, currentIndex]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === "d") {
        e.preventDefault();
        goToPrevious();
      } else if (key === "f") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (frames.length === 0) {
    return null;
  }

  // Check if adjacent frames are preloaded
  const prevPreloaded = hasPrevious && isPreloaded(frames[currentIndex - 1].id);
  const nextPreloaded = hasNext && isPreloaded(frames[currentIndex + 1].id);

  return (
    <div className="flex items-center gap-1 flex-shrink-0">
      <button
        type="button"
        onClick={goToPrevious}
        disabled={!hasPrevious || disabled}
        className={`
          inline-flex items-center justify-center size-8 rounded-md
          border transition-all duration-200
          ${
            !hasPrevious || disabled
              ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-transparent"
              : prevPreloaded
                ? "bg-background hover:bg-accent text-foreground border-border hover:border-primary/50"
                : "bg-background hover:bg-accent text-foreground border-border"
          }
        `}
        title="前へ (D)"
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
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
      </button>

      <span className="text-xs text-muted-foreground min-w-[50px] text-center tabular-nums">
        {currentIndex + 1}/{frames.length}
      </span>

      <button
        type="button"
        onClick={goToNext}
        disabled={!hasNext || disabled}
        className={`
          inline-flex items-center justify-center size-8 rounded-md
          border transition-all duration-200
          ${
            !hasNext || disabled
              ? "opacity-50 cursor-not-allowed bg-muted text-muted-foreground border-transparent"
              : nextPreloaded
                ? "bg-background hover:bg-accent text-foreground border-border hover:border-primary/50"
                : "bg-background hover:bg-accent text-foreground border-border"
          }
        `}
        title="次へ (F)"
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
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </button>
    </div>
  );
}

// Client-side Frame Strip that uses callback instead of router
interface FrameStripClientProps {
  frames: Frame[];
  currentFrameId: string;
  onNavigate: (frameId: string) => void;
  isPreloaded: (frameId: string) => boolean;
}

function FrameStripClient({
  frames,
  currentFrameId,
  onNavigate,
  isPreloaded,
}: FrameStripClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentIndex = frames.findIndex((f) => f.id === currentFrameId);

  // Scroll to current frame
  useEffect(() => {
    if (!containerRef.current || currentIndex === -1) return;

    const container = containerRef.current;
    const thumbnailWidth = 48; // w-12 = 3rem = 48px
    const gap = 4; // gap-1 = 0.25rem = 4px
    const itemWidth = thumbnailWidth + gap;
    const containerWidth = container.offsetWidth;

    const targetScroll =
      currentIndex * itemWidth - containerWidth / 2 + thumbnailWidth / 2;

    container.scrollTo({
      left: Math.max(0, targetScroll),
      behavior: "instant",
    });
  }, [currentIndex]);

  if (frames.length === 0) {
    return (
      <div className="h-10 flex items-center justify-center text-muted-foreground text-xs">
        フレームがありません
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex gap-1 overflow-x-auto py-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
      style={{ scrollbarWidth: "thin" }}
    >
      {frames.map((frame) => {
        const isCurrent = frame.id === currentFrameId;
        const preloaded = isPreloaded(frame.id);

        return (
          <button
            key={frame.id}
            type="button"
            onClick={() => onNavigate(frame.id)}
            className={`
              relative flex-shrink-0 w-12 h-8 rounded overflow-hidden
              border transition-all duration-200 group
              ${
                isCurrent
                  ? "border-primary ring-1 ring-primary/30"
                  : preloaded
                    ? "border-border/50 hover:border-primary/50"
                    : "border-transparent hover:border-border"
              }
            `}
          >
            {frame.thumbnail_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={frame.thumbnail_url}
                alt={`Frame ${frame.frame_number}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-muted flex items-center justify-center">
                <span className="text-[8px] text-muted-foreground">
                  {frame.frame_number}
                </span>
              </div>
            )}

            {/* Frame number overlay - only on current */}
            {isCurrent ? (
              <div className="absolute bottom-0 left-0 right-0 bg-primary text-primary-foreground text-[8px] font-medium text-center">
                {frame.frame_number}
              </div>
            ) : null}

            {/* Preload indicator */}
            {preloaded && !isCurrent ? (
              <div className="absolute top-0.5 right-0.5 size-1 rounded-full bg-green-500" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
