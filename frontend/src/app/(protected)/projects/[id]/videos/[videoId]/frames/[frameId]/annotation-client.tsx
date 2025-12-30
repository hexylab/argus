"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import type { FrameDetail, Frame } from "@/types/frame";
import type { Label } from "@/types/label";
import type { Annotation, BoundingBoxData } from "@/types/annotation";
import { FrameNavigator } from "./components/frame-navigator";
import { FrameStrip } from "./components/frame-strip";
import { LabelSidebar } from "./components/label-sidebar";
import { SaveIndicator, type SaveStatus } from "./components/save-indicator";
import { saveAnnotationsAction } from "./actions";

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

interface AnnotationClientProps {
  frame: FrameDetail;
  frames: Frame[];
  labels: Label[];
  initialAnnotations: Annotation[];
  projectId: string;
  videoId: string;
}

function convertToPixelCoords(
  annotation: Annotation,
  imageWidth: number,
  imageHeight: number,
  labels: Label[]
): BoundingBoxData {
  const label = labels.find((l) => l.id === annotation.label_id);
  return {
    id: annotation.id,
    x: annotation.bbox_x * imageWidth,
    y: annotation.bbox_y * imageHeight,
    width: annotation.bbox_width * imageWidth,
    height: annotation.bbox_height * imageHeight,
    labelId: annotation.label_id,
    labelName: label?.name ?? "Unknown",
    labelColor: label?.color ?? "#808080",
  };
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

export function AnnotationClient({
  frame,
  frames,
  labels,
  initialAnnotations,
  projectId,
  videoId,
}: AnnotationClientProps) {
  const imageWidth = frame.width ?? 1920;
  const imageHeight = frame.height ?? 1080;

  // Convert initial annotations to pixel coordinates
  const initialBboxData = useMemo(
    () =>
      initialAnnotations.map((a) =>
        convertToPixelCoords(a, imageWidth, imageHeight, labels)
      ),
    [initialAnnotations, imageWidth, imageHeight, labels]
  );

  const [annotations, setAnnotations] =
    useState<BoundingBoxData[]>(initialBboxData);
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(
    labels[0]?.id ?? null
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [isSaving, setIsSaving] = useState(false);

  const lastSavedRef = useRef<string>(JSON.stringify(initialBboxData));
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    const current = JSON.stringify(annotations);
    if (current === lastSavedRef.current) {
      setSaveStatus("saved");
      return;
    }

    setIsSaving(true);
    setSaveStatus("saving");

    try {
      const normalizedAnnotations = annotations.map((bbox) =>
        convertToNormalizedCoords(bbox, imageWidth, imageHeight)
      );

      const result = await saveAnnotationsAction(
        projectId,
        videoId,
        frame.id,
        normalizedAnnotations
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
    imageWidth,
    imageHeight,
    projectId,
    videoId,
    frame.id,
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

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: Navigator + Save indicator */}
      <div className="flex-none border-b bg-background px-4 py-2">
        <div className="flex items-center justify-between">
          <FrameNavigator
            frames={frames}
            currentFrameId={frame.id}
            projectId={projectId}
            videoId={videoId}
            disabled={isSaving}
          />
          <SaveIndicator status={saveStatus} onSave={save} />
        </div>
      </div>

      {/* Frame strip */}
      <div className="flex-none border-b bg-muted/30">
        <FrameStrip
          frames={frames}
          currentFrameId={frame.id}
          projectId={projectId}
          videoId={videoId}
        />
      </div>

      {/* Main content: Canvas + Sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Canvas area */}
        <div className="flex-1 min-w-0">
          <AnnotationCanvas
            imageUrl={frame.image_url}
            initialWidth={frame.width ?? undefined}
            initialHeight={frame.height ?? undefined}
            labels={labels}
            initialAnnotations={initialBboxData}
            onChange={handleAnnotationsChange}
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
