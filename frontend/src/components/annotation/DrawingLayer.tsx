"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Rect, Layer, Line, Circle, Group, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { DrawingRect } from "@/types/annotation";

interface DrawingLayerProps {
  imageWidth: number;
  imageHeight: number;
  isActive: boolean;
  onDrawEnd: (rect: DrawingRect) => void;
}

const MIN_BOX_SIZE = 10;

// Professional precision tool colors
const COLORS = {
  primary: "#06B6D4", // cyan-500 - precise, technical feel
  primaryLight: "rgba(6, 182, 212, 0.15)",
  accent: "#22D3EE", // cyan-400 - for highlights
  startPoint: "#F59E0B", // amber-500 - distinct start marker
  startPointGlow: "rgba(245, 158, 11, 0.3)",
};

export function DrawingLayer({
  imageWidth,
  imageHeight,
  isActive,
  onDrawEnd,
}: DrawingLayerProps) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(
    null
  );
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dashOffset, setDashOffset] = useState(0);
  const animationRef = useRef<number | null>(null);

  // Animated dash effect for preview rectangle
  useEffect(() => {
    if (!startPoint || !isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = () => {
      setDashOffset((prev) => (prev + 0.5) % 20);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [startPoint, isActive]);

  // Handle Escape key to cancel drawing
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && startPoint) {
        e.stopPropagation();
        setStartPoint(null);
        setCurrentPos(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isActive, startPoint]);

  // Reset state when deactivated
  useEffect(() => {
    if (!isActive) {
      setStartPoint(null);
      setCurrentPos(null);
    }
  }, [isActive]);

  const clampToImage = useCallback(
    (x: number, y: number) => ({
      x: Math.max(0, Math.min(x, imageWidth)),
      y: Math.max(0, Math.min(y, imageHeight)),
    }),
    [imageWidth, imageHeight]
  );

  const handleClick = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      const clamped = clampToImage(pos.x, pos.y);

      // First click - set start point (only within image bounds)
      if (!startPoint) {
        if (
          pos.x < 0 ||
          pos.x > imageWidth ||
          pos.y < 0 ||
          pos.y > imageHeight
        ) {
          return;
        }
        setStartPoint(clamped);
        setCurrentPos(clamped);
        return;
      }

      // Second click - complete the rectangle
      const rect = calculateRect(startPoint, clamped);

      // Only create if size is large enough
      if (rect.width >= MIN_BOX_SIZE && rect.height >= MIN_BOX_SIZE) {
        onDrawEnd(rect);
      }

      // Reset state
      setStartPoint(null);
      setCurrentPos(null);
    },
    [isActive, startPoint, imageWidth, imageHeight, clampToImage, onDrawEnd]
  );

  const handleMouseMove = useCallback(
    (e: KonvaEventObject<MouseEvent>) => {
      if (!isActive || !startPoint) return;

      const stage = e.target.getStage();
      if (!stage) return;

      const pos = stage.getRelativePointerPosition();
      if (!pos) return;

      // Clamp position to image bounds
      setCurrentPos(clampToImage(pos.x, pos.y));
    },
    [isActive, startPoint, clampToImage]
  );

  if (!isActive) return null;

  const previewRect =
    startPoint && currentPos ? calculateRect(startPoint, currentPos) : null;
  const isValidSize =
    previewRect &&
    previewRect.width >= MIN_BOX_SIZE &&
    previewRect.height >= MIN_BOX_SIZE;

  return (
    <Layer>
      {/* Invisible rect to capture mouse events */}
      <Rect
        x={0}
        y={0}
        width={imageWidth}
        height={imageHeight}
        fill="transparent"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />

      {/* Start point marker - crosshair with glow */}
      {startPoint ? (
        <Group x={startPoint.x} y={startPoint.y}>
          {/* Outer glow */}
          <Circle radius={12} fill={COLORS.startPointGlow} listening={false} />
          {/* Center dot */}
          <Circle
            radius={4}
            fill={COLORS.startPoint}
            stroke="#fff"
            strokeWidth={1}
            listening={false}
          />
          {/* Crosshair lines */}
          <Line
            points={[-16, 0, -6, 0]}
            stroke={COLORS.startPoint}
            strokeWidth={2}
            lineCap="round"
            listening={false}
          />
          <Line
            points={[6, 0, 16, 0]}
            stroke={COLORS.startPoint}
            strokeWidth={2}
            lineCap="round"
            listening={false}
          />
          <Line
            points={[0, -16, 0, -6]}
            stroke={COLORS.startPoint}
            strokeWidth={2}
            lineCap="round"
            listening={false}
          />
          <Line
            points={[0, 6, 0, 16]}
            stroke={COLORS.startPoint}
            strokeWidth={2}
            lineCap="round"
            listening={false}
          />
        </Group>
      ) : null}

      {/* Preview rectangle */}
      {previewRect && previewRect.width > 0 && previewRect.height > 0 ? (
        <>
          {/* Fill */}
          <Rect
            x={previewRect.x}
            y={previewRect.y}
            width={previewRect.width}
            height={previewRect.height}
            fill={isValidSize ? COLORS.primaryLight : "rgba(239, 68, 68, 0.1)"}
            listening={false}
          />
          {/* Animated dashed border */}
          <Rect
            x={previewRect.x}
            y={previewRect.y}
            width={previewRect.width}
            height={previewRect.height}
            stroke={isValidSize ? COLORS.primary : "#EF4444"}
            strokeWidth={2}
            dash={[8, 4]}
            dashOffset={dashOffset}
            listening={false}
          />
          {/* Corner markers for precision */}
          {isValidSize ? (
            <>
              <CornerMarker
                x={previewRect.x}
                y={previewRect.y}
                rotation={0}
                color={COLORS.accent}
              />
              <CornerMarker
                x={previewRect.x + previewRect.width}
                y={previewRect.y}
                rotation={90}
                color={COLORS.accent}
              />
              <CornerMarker
                x={previewRect.x + previewRect.width}
                y={previewRect.y + previewRect.height}
                rotation={180}
                color={COLORS.accent}
              />
              <CornerMarker
                x={previewRect.x}
                y={previewRect.y + previewRect.height}
                rotation={270}
                color={COLORS.accent}
              />
            </>
          ) : null}
          {/* Size indicator */}
          <SizeIndicator rect={previewRect} isValid={isValidSize ?? false} />
        </>
      ) : null}
    </Layer>
  );
}

// Helper to calculate rectangle from two points
function calculateRect(
  p1: { x: number; y: number },
  p2: { x: number; y: number }
): DrawingRect {
  return {
    x: Math.min(p1.x, p2.x),
    y: Math.min(p1.y, p2.y),
    width: Math.abs(p2.x - p1.x),
    height: Math.abs(p2.y - p1.y),
  };
}

// Corner bracket marker component
function CornerMarker({
  x,
  y,
  rotation,
  color,
}: {
  x: number;
  y: number;
  rotation: number;
  color: string;
}) {
  const size = 8;
  return (
    <Group x={x} y={y} rotation={rotation}>
      <Line
        points={[0, size, 0, 0, size, 0]}
        stroke={color}
        strokeWidth={2}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
    </Group>
  );
}

// Size indicator component
function SizeIndicator({
  rect,
  isValid,
}: {
  rect: DrawingRect;
  isValid: boolean;
}) {
  const sizeText = `${Math.round(rect.width)} x ${Math.round(rect.height)}`;
  const paddingX = 6;
  const paddingY = 3;
  const fontSize = 11;
  const textWidth = sizeText.length * 6;
  const textHeight = fontSize;

  // Position below the rectangle, centered
  const labelX = rect.x + rect.width / 2 - (textWidth + paddingX * 2) / 2;
  const labelY = rect.y + rect.height + 6;

  return (
    <Group x={labelX} y={labelY} listening={false}>
      <Rect
        width={textWidth + paddingX * 2}
        height={textHeight + paddingY * 2}
        fill={isValid ? "rgba(6, 182, 212, 0.95)" : "rgba(239, 68, 68, 0.95)"}
        cornerRadius={3}
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={4}
        shadowOffsetY={1}
      />
      <Text
        x={paddingX}
        y={paddingY}
        text={sizeText}
        fontSize={fontSize}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="#ffffff"
        listening={false}
      />
    </Group>
  );
}
