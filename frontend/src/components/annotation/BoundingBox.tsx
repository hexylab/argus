"use client";

import { useRef, useEffect, useState } from "react";
import { Rect, Text, Group, Transformer } from "react-konva";
import type Konva from "konva";
import type { BoundingBoxData } from "@/types/annotation";

export interface TransformResult {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BoundingBoxProps {
  data: BoundingBoxData;
  isSelected: boolean;
  imageWidth: number;
  imageHeight: number;
  onSelect: (id: string) => void;
  onTransformStart?: () => void;
  onTransformEnd?: (id: string, result: TransformResult) => void;
  onDragStart?: () => void;
  onDragEnd?: (id: string, result: TransformResult) => void;
}

const MIN_SIZE = 10;
const LABEL_HEIGHT = 20;
const LABEL_PADDING_X = 6;
const LABEL_FONT_SIZE = 12;
const DIMENSION_LABEL_HEIGHT = 18;
const DIMENSION_LABEL_PADDING = 4;

export function BoundingBox({
  data,
  isSelected,
  imageWidth,
  imageHeight,
  onSelect,
  onTransformStart,
  onTransformEnd,
  onDragStart,
  onDragEnd,
}: BoundingBoxProps) {
  const shapeRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  // Live position tracking for real-time label sync
  const [liveBox, setLiveBox] = useState({
    x: data.x,
    y: data.y,
    width: data.width,
    height: data.height,
  });

  // Track Shift key state for aspect ratio locking
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Track if currently transforming (resizing)
  const [isTransforming, setIsTransforming] = useState(false);

  // Sync with data when it changes (e.g., after undo/redo or external update)
  useEffect(() => {
    setLiveBox({
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    });
  }, [data.x, data.y, data.width, data.height]);

  const strokeWidth = isSelected ? 2.5 : 2;

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && shapeRef.current) {
      transformerRef.current.nodes([shapeRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Track Shift key for aspect ratio locking
  useEffect(() => {
    if (!isSelected) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isSelected]);

  // Clamp position within image bounds
  const clampPosition = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    return {
      x: Math.max(0, Math.min(x, imageWidth - width)),
      y: Math.max(0, Math.min(y, imageHeight - height)),
    };
  };

  const handleDragStart = () => {
    onDragStart?.();
  };

  // Real-time position update during drag with clamping
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const currentX = node.x();
    const currentY = node.y();

    // Clamp position to image bounds
    const clamped = clampPosition(currentX, currentY, data.width, data.height);

    // Apply clamped position if different
    if (clamped.x !== currentX || clamped.y !== currentY) {
      node.position(clamped);
    }

    setLiveBox((prev) => ({
      ...prev,
      x: clamped.x,
      y: clamped.y,
    }));
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const clamped = clampPosition(node.x(), node.y(), data.width, data.height);

    // Apply clamped position
    node.position(clamped);

    // Update live box to clamped position
    setLiveBox((prev) => ({
      ...prev,
      x: clamped.x,
      y: clamped.y,
    }));

    onDragEnd?.(data.id, {
      x: clamped.x,
      y: clamped.y,
      width: data.width,
      height: data.height,
    });
  };

  const handleTransformStart = () => {
    setIsTransforming(true);
    onTransformStart?.();
  };

  // Real-time size/position update during transform
  const handleTransform = () => {
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    setLiveBox({
      x: node.x(),
      y: node.y(),
      width: node.width() * scaleX,
      height: node.height() * scaleY,
    });
  };

  const handleTransformEnd = () => {
    setIsTransforming(false);
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and apply to width/height
    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
    const newHeight = Math.max(MIN_SIZE, node.height() * scaleY);

    // Clamp position
    const clamped = clampPosition(node.x(), node.y(), newWidth, newHeight);

    // Update live box
    setLiveBox({
      x: clamped.x,
      y: clamped.y,
      width: newWidth,
      height: newHeight,
    });

    onTransformEnd?.(data.id, {
      x: clamped.x,
      y: clamped.y,
      width: newWidth,
      height: newHeight,
    });
  };

  // Calculate label width based on text
  const labelWidth = data.labelName.length * 8 + LABEL_PADDING_X * 2;

  // Calculate label position (adjacent to bbox, no gap)
  const labelX = liveBox.x;
  const labelY = liveBox.y - LABEL_HEIGHT;

  // Dimension label text during transform
  const dimensionText = `${Math.round(liveBox.width)} × ${Math.round(liveBox.height)}`;
  const dimensionLabelWidth =
    dimensionText.length * 7 + DIMENSION_LABEL_PADDING * 2;

  return (
    <>
      {/* Label - adjacent to the bounding box */}
      <Group x={labelX} y={labelY} listening={false}>
        <Rect
          width={labelWidth}
          height={LABEL_HEIGHT}
          fill={data.labelColor}
          cornerRadius={[4, 4, 0, 0]}
        />
        <Text
          x={LABEL_PADDING_X}
          y={4}
          text={data.labelName}
          fontSize={LABEL_FONT_SIZE}
          fontFamily="system-ui, sans-serif"
          fill="white"
        />
      </Group>

      {/* Dimension label - shown during transform */}
      {isTransforming ? (
        <Group
          x={liveBox.x + liveBox.width - dimensionLabelWidth}
          y={liveBox.y + liveBox.height + 4}
          listening={false}
        >
          <Rect
            width={dimensionLabelWidth}
            height={DIMENSION_LABEL_HEIGHT}
            fill="rgba(0, 0, 0, 0.75)"
            cornerRadius={3}
          />
          <Text
            x={DIMENSION_LABEL_PADDING}
            y={3}
            text={dimensionText}
            fontSize={11}
            fontFamily="system-ui, sans-serif"
            fill="white"
          />
        </Group>
      ) : null}

      {/* Bounding box - draggable */}
      <Rect
        ref={shapeRef}
        x={data.x}
        y={data.y}
        width={data.width}
        height={data.height}
        stroke={data.labelColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        draggable
        onClick={() => onSelect(data.id)}
        onTap={() => onSelect(data.id)}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransform={handleTransform}
        onTransformEnd={handleTransformEnd}
        hitStrokeWidth={10}
      />

      {/* Transformer - only when selected */}
      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={isShiftPressed}
          enabledAnchors={[
            "top-left",
            "top-center",
            "top-right",
            "middle-left",
            "middle-right",
            "bottom-left",
            "bottom-center",
            "bottom-right",
          ]}
          anchorSize={10}
          anchorCornerRadius={3}
          anchorStroke={data.labelColor}
          anchorFill="white"
          anchorStrokeWidth={1.5}
          borderStroke={data.labelColor}
          borderStrokeWidth={0}
          borderDash={[]}
          boundBoxFunc={(oldBox, newBox) => {
            // Enforce minimum size
            if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) {
              return oldBox;
            }
            // Enforce image bounds
            if (
              newBox.x < 0 ||
              newBox.y < 0 ||
              newBox.x + newBox.width > imageWidth ||
              newBox.y + newBox.height > imageHeight
            ) {
              return oldBox;
            }
            return newBox;
          }}
        />
      ) : null}
    </>
  );
}
