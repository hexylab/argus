"use client";

import { useState, useCallback } from "react";
import { Rect, Layer } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { DrawingRect } from "@/types/annotation";

interface DrawingLayerProps {
  imageWidth: number;
  imageHeight: number;
  isActive: boolean;
  onDrawEnd: (rect: DrawingRect) => void;
}

const MIN_BOX_SIZE = 10;
const DRAWING_COLOR = "#3B82F6"; // blue-500

export function DrawingLayer({
  imageWidth,
  imageHeight,
  isActive,
  onDrawEnd,
}: DrawingLayerProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentRect, setCurrentRect] = useState<DrawingRect | null>(null);

  const handleMouseDown = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      // Only start if within image bounds
      if (pos.x < 0 || pos.x > imageWidth || pos.y < 0 || pos.y > imageHeight) {
        return;
      }

      setIsDrawing(true);
      setStartPoint({ x: pos.x, y: pos.y });
      setCurrentRect({ x: pos.x, y: pos.y, width: 0, height: 0 });
    },
    [isActive, imageWidth, imageHeight]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isDrawing || !startPoint || !isActive) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      // Clamp to image bounds
      const clampedX = Math.max(0, Math.min(pos.x, imageWidth));
      const clampedY = Math.max(0, Math.min(pos.y, imageHeight));

      // Calculate rectangle (handle negative dimensions)
      const x = Math.min(startPoint.x, clampedX);
      const y = Math.min(startPoint.y, clampedY);
      const width = Math.abs(clampedX - startPoint.x);
      const height = Math.abs(clampedY - startPoint.y);

      setCurrentRect({ x, y, width, height });
    },
    [isDrawing, startPoint, isActive, imageWidth, imageHeight]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !currentRect || !isActive) {
      setIsDrawing(false);
      setStartPoint(null);
      setCurrentRect(null);
      return;
    }

    // Only create if size is large enough
    if (
      currentRect.width >= MIN_BOX_SIZE &&
      currentRect.height >= MIN_BOX_SIZE
    ) {
      onDrawEnd(currentRect);
    }

    setIsDrawing(false);
    setStartPoint(null);
    setCurrentRect(null);
  }, [isDrawing, currentRect, isActive, onDrawEnd]);

  if (!isActive) return null;

  return (
    <Layer>
      {/* Invisible rect to capture mouse events over the entire image */}
      <Rect
        x={0}
        y={0}
        width={imageWidth}
        height={imageHeight}
        fill="transparent"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />

      {/* Drawing preview */}
      {currentRect && currentRect.width > 0 && currentRect.height > 0 ? (
        <Rect
          x={currentRect.x}
          y={currentRect.y}
          width={currentRect.width}
          height={currentRect.height}
          stroke={DRAWING_COLOR}
          strokeWidth={2}
          dash={[5, 5]}
          fill="rgba(59, 130, 246, 0.1)"
          listening={false}
        />
      ) : null}
    </Layer>
  );
}
