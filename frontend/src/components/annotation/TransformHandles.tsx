"use client";

import { useState, useCallback } from "react";
import { Rect, Group } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

export interface TransformBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface TransformHandlesProps {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  imageWidth: number;
  imageHeight: number;
  minSize?: number;
  onTransformStart: () => void;
  onTransform: (newBounds: TransformBounds) => void;
  onTransformEnd: () => void;
}

type HandlePosition = "nw" | "ne" | "sw" | "se";

const HANDLE_SIZE = 10;
const HANDLE_OFFSET = HANDLE_SIZE / 2;

export function TransformHandles({
  x,
  y,
  width,
  height,
  color,
  imageWidth,
  imageHeight,
  minSize = 10,
  onTransformStart,
  onTransform,
  onTransformEnd,
}: TransformHandlesProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<HandlePosition | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(
    null
  );
  const [originalBounds, setOriginalBounds] = useState<TransformBounds | null>(
    null
  );

  // Clamp bounds to image area
  const clampBounds = useCallback(
    (bounds: TransformBounds): TransformBounds => {
      let { x: bx, y: by, width: bw, height: bh } = bounds;

      // Ensure minimum size
      bw = Math.max(bw, minSize);
      bh = Math.max(bh, minSize);

      // Clamp position to image bounds
      bx = Math.max(0, Math.min(bx, imageWidth - bw));
      by = Math.max(0, Math.min(by, imageHeight - bh));

      return { x: bx, y: by, width: bw, height: bh };
    },
    [imageWidth, imageHeight, minSize]
  );

  // Handle positions
  const handles: { position: HandlePosition; x: number; y: number }[] = [
    { position: "nw", x: x - HANDLE_OFFSET, y: y - HANDLE_OFFSET },
    { position: "ne", x: x + width - HANDLE_OFFSET, y: y - HANDLE_OFFSET },
    { position: "sw", x: x - HANDLE_OFFSET, y: y + height - HANDLE_OFFSET },
    {
      position: "se",
      x: x + width - HANDLE_OFFSET,
      y: y + height - HANDLE_OFFSET,
    },
  ];

  // Get cursor for handle position
  const getCursor = (position: HandlePosition): string => {
    switch (position) {
      case "nw":
      case "se":
        return "nwse-resize";
      case "ne":
      case "sw":
        return "nesw-resize";
    }
  };

  // Box drag handlers
  const handleBoxDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      setIsDragging(true);
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      setDragStart(pos);
      setOriginalBounds({ x, y, width, height });
      onTransformStart();
    },
    [x, y, width, height, onTransformStart]
  );

  const handleBoxDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!isDragging || !dragStart || !originalBounds) return;
      e.cancelBubble = true;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      const newBounds = clampBounds({
        x: originalBounds.x + dx,
        y: originalBounds.y + dy,
        width: originalBounds.width,
        height: originalBounds.height,
      });

      // Reset the group position (we're updating via callback)
      e.target.position({ x: newBounds.x, y: newBounds.y });

      onTransform(newBounds);
    },
    [isDragging, dragStart, originalBounds, clampBounds, onTransform]
  );

  const handleBoxDragEnd = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      e.cancelBubble = true;
      setIsDragging(false);
      setDragStart(null);
      setOriginalBounds(null);
      onTransformEnd();
    },
    [onTransformEnd]
  );

  // Resize handlers
  const handleResizeStart = useCallback(
    (position: HandlePosition) => (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      setIsResizing(true);
      setResizeHandle(position);
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;
      setDragStart(pos);
      setOriginalBounds({ x, y, width, height });
      onTransformStart();
    },
    [x, y, width, height, onTransformStart]
  );

  const handleResizeMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isResizing || !resizeHandle || !dragStart || !originalBounds) return;
      e.cancelBubble = true;

      const stage = e.target.getStage();
      if (!stage) return;
      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      let newBounds = { ...originalBounds };

      switch (resizeHandle) {
        case "nw":
          newBounds = {
            x: originalBounds.x + dx,
            y: originalBounds.y + dy,
            width: originalBounds.width - dx,
            height: originalBounds.height - dy,
          };
          break;
        case "ne":
          newBounds = {
            x: originalBounds.x,
            y: originalBounds.y + dy,
            width: originalBounds.width + dx,
            height: originalBounds.height - dy,
          };
          break;
        case "sw":
          newBounds = {
            x: originalBounds.x + dx,
            y: originalBounds.y,
            width: originalBounds.width - dx,
            height: originalBounds.height + dy,
          };
          break;
        case "se":
          newBounds = {
            x: originalBounds.x,
            y: originalBounds.y,
            width: originalBounds.width + dx,
            height: originalBounds.height + dy,
          };
          break;
      }

      // Handle negative dimensions (dragging past opposite corner)
      if (newBounds.width < minSize) {
        if (resizeHandle === "nw" || resizeHandle === "sw") {
          newBounds.x = originalBounds.x + originalBounds.width - minSize;
        }
        newBounds.width = minSize;
      }
      if (newBounds.height < minSize) {
        if (resizeHandle === "nw" || resizeHandle === "ne") {
          newBounds.y = originalBounds.y + originalBounds.height - minSize;
        }
        newBounds.height = minSize;
      }

      // Clamp to image bounds
      newBounds = clampBounds(newBounds);

      onTransform(newBounds);
    },
    [
      isResizing,
      resizeHandle,
      dragStart,
      originalBounds,
      minSize,
      clampBounds,
      onTransform,
    ]
  );

  const handleResizeEnd = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      setIsResizing(false);
      setResizeHandle(null);
      setDragStart(null);
      setOriginalBounds(null);
      onTransformEnd();
    },
    [onTransformEnd]
  );

  return (
    <Group>
      {/* Draggable box area */}
      <Rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="transparent"
        draggable
        onDragStart={handleBoxDragStart}
        onDragMove={handleBoxDragMove}
        onDragEnd={handleBoxDragEnd}
        dragBoundFunc={(pos) => {
          // This is called during native Konva drag
          // We handle bounds clamping in our handlers
          return pos;
        }}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          if (!isDragging) {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
          }
        }}
      />

      {/* Resize handles at corners */}
      {handles.map(({ position, x: hx, y: hy }) => (
        <Rect
          key={position}
          x={hx}
          y={hy}
          width={HANDLE_SIZE}
          height={HANDLE_SIZE}
          fill={color}
          stroke="white"
          strokeWidth={1}
          onMouseDown={handleResizeStart(position)}
          onMouseMove={handleResizeMove}
          onMouseUp={handleResizeEnd}
          onMouseLeave={(e) => {
            if (isResizing) {
              handleResizeEnd(e);
            }
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = getCursor(position);
          }}
        />
      ))}

      {/* Global mouse move/up handler for resize when mouse leaves handle */}
      {isResizing ? (
        <Rect
          x={0}
          y={0}
          width={imageWidth}
          height={imageHeight}
          fill="transparent"
          onMouseMove={handleResizeMove}
          onMouseUp={handleResizeEnd}
        />
      ) : null}
    </Group>
  );
}
