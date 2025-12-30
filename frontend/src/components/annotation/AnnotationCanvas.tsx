"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Stage, Layer } from "react-konva";
import type { Stage as StageType } from "konva/lib/Stage";
import { ImageLayer } from "./ImageLayer";
import { BoundingBox, type TransformResult } from "./BoundingBox";
import { DrawingLayer } from "./DrawingLayer";
import { AnnotationToolbar } from "./AnnotationToolbar";
import { LabelSelectDialog } from "./LabelSelectDialog";
import { HelpDialog } from "./HelpDialog";
import { useAnnotationHistory } from "./hooks/useAnnotationHistory";
import type { Label } from "@/types/label";
import type {
  AnnotationMode,
  BoundingBoxData,
  DrawingRect,
} from "@/types/annotation";

interface AnnotationCanvasProps {
  imageUrl: string;
  initialWidth?: number;
  initialHeight?: number;
  labels: Label[];
  initialAnnotations?: BoundingBoxData[];
  onChange?: (annotations: BoundingBoxData[]) => void;
  selectedLabelId?: string | null;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 10;
const SCALE_BY = 1.1;

export function AnnotationCanvas({
  imageUrl,
  initialWidth,
  initialHeight,
  labels,
  initialAnnotations = [],
  onChange,
  selectedLabelId,
}: AnnotationCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageType>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({
    width: initialWidth ?? 0,
    height: initialHeight ?? 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Annotation state with history
  const {
    annotations,
    setAnnotations,
    pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useAnnotationHistory(initialAnnotations);

  // Notify parent of annotation changes
  useEffect(() => {
    onChange?.(annotations);
  }, [annotations, onChange]);

  const [mode, setMode] = useState<AnnotationMode>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingRect, setPendingRect] = useState<DrawingRect | null>(null);
  const [showLabelDialog, setShowLabelDialog] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Space key for temporary panning
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Update stage size on container resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setStageSize({ width: clientWidth, height: clientHeight });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space key for temporary pan
      if (e.code === "Space" && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      // Undo: Ctrl+Z (or Cmd+Z on Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // Redo: Ctrl+Shift+Z, Ctrl+Y (or Cmd+Shift+Z, Cmd+Y on Mac)
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key === "y")
      ) {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case "v":
          setMode("select");
          break;
        case "d":
        case "r":
          setMode("draw");
          break;
        case "escape":
          setMode("select");
          setSelectedId(null);
          break;
        case "delete":
        case "backspace":
          if (selectedId) {
            pushHistory();
            setAnnotations((prev) => prev.filter((a) => a.id !== selectedId));
            setSelectedId(null);
          }
          break;
        case "?":
          setShowHelpDialog(true);
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedId, isSpacePressed, undo, redo, pushHistory, setAnnotations]);

  // Determine if stage should be draggable
  const isDraggable = mode === "select" || isSpacePressed;

  // Determine if drawing is active
  const isDrawingActive = mode === "draw" && !isSpacePressed;

  // Get cursor style
  const getCursor = () => {
    if (isSpacePressed) return "grab";
    if (mode === "draw") return "crosshair";
    return "default";
  };

  // Fit image to canvas when image loads
  const handleImageLoad = useCallback(
    (width: number, height: number) => {
      setImageSize({ width, height });
      setIsLoading(false);

      // Calculate scale to fit image in canvas with padding
      const padding = 40;
      const availableWidth = stageSize.width - padding * 2;
      const availableHeight = stageSize.height - padding * 2;

      const scaleX = availableWidth / width;
      const scaleY = availableHeight / height;
      const fitScale = Math.min(scaleX, scaleY, 1);

      setScale(fitScale);

      // Center the image
      const centerX = (stageSize.width - width * fitScale) / 2;
      const centerY = (stageSize.height - height * fitScale) / 2;
      setPosition({ x: centerX, y: centerY });
    },
    [stageSize.width, stageSize.height]
  );

  // Handle mouse wheel for zooming
  const handleWheel = useCallback(
    (e: { evt: WheelEvent }) => {
      e.evt.preventDefault();

      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = scale;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      // Calculate position relative to stage
      const mousePointTo = {
        x: (pointer.x - position.x) / oldScale,
        y: (pointer.y - position.y) / oldScale,
      };

      // Determine zoom direction
      let direction = e.evt.deltaY > 0 ? -1 : 1;

      // Reverse direction for trackpad pinch
      if (e.evt.ctrlKey) {
        direction = -direction;
      }

      // Calculate new scale
      const newScale =
        direction > 0 ? oldScale * SCALE_BY : oldScale / SCALE_BY;
      const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

      setScale(clampedScale);

      // Adjust position to zoom toward mouse pointer
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      setPosition(newPos);
    },
    [scale, position]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    setPosition({
      x: stage.x(),
      y: stage.y(),
    });
  }, []);

  // Reset view to fit image
  const handleResetView = useCallback(() => {
    if (imageSize.width === 0 || imageSize.height === 0) return;

    const padding = 40;
    const availableWidth = stageSize.width - padding * 2;
    const availableHeight = stageSize.height - padding * 2;

    const scaleX = availableWidth / imageSize.width;
    const scaleY = availableHeight / imageSize.height;
    const fitScale = Math.min(scaleX, scaleY, 1);

    setScale(fitScale);

    const centerX = (stageSize.width - imageSize.width * fitScale) / 2;
    const centerY = (stageSize.height - imageSize.height * fitScale) / 2;
    setPosition({ x: centerX, y: centerY });
  }, [stageSize, imageSize]);

  // Handle drawing complete
  const handleDrawEnd = useCallback(
    (rect: DrawingRect) => {
      // If a label is pre-selected from sidebar, use it directly
      if (selectedLabelId) {
        const label = labels.find((l) => l.id === selectedLabelId);
        if (label) {
          pushHistory();
          const newAnnotation: BoundingBoxData = {
            id: `temp-${Date.now()}`,
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            labelId: label.id,
            labelName: label.name,
            labelColor: label.color,
          };
          setAnnotations((prev) => [...prev, newAnnotation]);
          return;
        }
      }
      // Otherwise, show label selection dialog
      setPendingRect(rect);
      setShowLabelDialog(true);
    },
    [selectedLabelId, labels, pushHistory, setAnnotations]
  );

  // Handle label selection
  const handleLabelSelect = useCallback(
    (labelId: string) => {
      if (!pendingRect) return;

      const label = labels.find((l) => l.id === labelId);
      if (!label) return;

      pushHistory();

      const newAnnotation: BoundingBoxData = {
        id: `temp-${Date.now()}`,
        x: pendingRect.x,
        y: pendingRect.y,
        width: pendingRect.width,
        height: pendingRect.height,
        labelId: label.id,
        labelName: label.name,
        labelColor: label.color,
      };

      setAnnotations((prev) => [...prev, newAnnotation]);
      setPendingRect(null);
      setShowLabelDialog(false);
    },
    [pendingRect, labels, pushHistory, setAnnotations]
  );

  // Handle label dialog cancel
  const handleLabelCancel = useCallback(() => {
    setPendingRect(null);
    setShowLabelDialog(false);
  }, []);

  // Handle bbox selection
  const handleBboxSelect = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Handle bbox drag/transform start (save state for undo)
  const handleTransformStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  // Handle bbox transform end
  const handleTransformEnd = useCallback(
    (id: string, result: TransformResult) => {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height,
              }
            : a
        )
      );
    },
    [setAnnotations]
  );

  // Handle bbox drag end
  const handleDragBboxEnd = useCallback(
    (id: string, result: TransformResult) => {
      setAnnotations((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                x: result.x,
                y: result.y,
                width: result.width,
                height: result.height,
              }
            : a
        )
      );
    },
    [setAnnotations]
  );

  // Handle stage click (deselect)
  const handleStageClick = useCallback(
    (e: { target: { getStage: () => StageType | null } }) => {
      // Only deselect if clicking on stage background
      const stage = e.target.getStage();
      if (e.target === stage) {
        setSelectedId(null);
      }
    },
    []
  );

  return (
    <div className="relative h-full w-full" ref={containerRef}>
      {/* Loading overlay */}
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
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
              画像を読み込み中...
            </span>
          </div>
        </div>
      ) : null}

      {/* Canvas */}
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={isDraggable}
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        style={{
          backgroundColor: "hsl(var(--muted))",
          cursor: getCursor(),
        }}
      >
        {/* Image layer */}
        <Layer>
          <ImageLayer imageUrl={imageUrl} onLoad={handleImageLoad} />
        </Layer>

        {/* Annotations layer */}
        <Layer>
          {annotations.map((annotation) => (
            <BoundingBox
              key={annotation.id}
              data={annotation}
              isSelected={annotation.id === selectedId}
              imageWidth={imageSize.width}
              imageHeight={imageSize.height}
              onSelect={handleBboxSelect}
              onTransformStart={handleTransformStart}
              onTransformEnd={handleTransformEnd}
              onDragStart={handleTransformStart}
              onDragEnd={handleDragBboxEnd}
            />
          ))}
        </Layer>

        {/* Drawing layer */}
        <DrawingLayer
          imageWidth={imageSize.width}
          imageHeight={imageSize.height}
          isActive={isDrawingActive}
          onDrawEnd={handleDrawEnd}
        />
      </Stage>

      {/* Toolbar */}
      <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2 shadow-sm">
        <AnnotationToolbar
          mode={mode}
          onModeChange={setMode}
          annotationCount={annotations.length}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onHelpClick={() => setShowHelpDialog(true)}
        />
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2 shadow-sm">
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(MAX_SCALE, s * SCALE_BY))}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="ズームイン"
        >
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6"
            />
          </svg>
        </button>
        <span className="text-xs text-muted-foreground min-w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(MIN_SCALE, s / SCALE_BY))}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="ズームアウト"
        >
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6"
            />
          </svg>
        </button>
        <div className="w-px h-4 bg-border mx-1" />
        <button
          type="button"
          onClick={handleResetView}
          className="p-1 hover:bg-muted rounded transition-colors"
          title="ビューをリセット"
        >
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"
            />
          </svg>
        </button>
      </div>

      {/* Image info */}
      {!isLoading && imageSize.width > 0 ? (
        <div className="absolute bottom-4 left-4 bg-background/80 backdrop-blur-sm rounded-lg border px-3 py-2 shadow-sm">
          <span className="text-xs text-muted-foreground">
            {imageSize.width} x {imageSize.height}
          </span>
        </div>
      ) : null}

      {/* Label selection dialog */}
      <LabelSelectDialog
        open={showLabelDialog}
        labels={labels}
        onSelect={handleLabelSelect}
        onCancel={handleLabelCancel}
      />

      {/* Help dialog */}
      <HelpDialog
        open={showHelpDialog}
        onClose={() => setShowHelpDialog(false)}
      />
    </div>
  );
}
