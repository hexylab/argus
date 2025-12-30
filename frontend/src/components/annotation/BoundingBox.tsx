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
const LABEL_HEIGHT = 22;
const LABEL_PADDING_X = 8;
const LABEL_PADDING_Y = 4;
const LABEL_FONT_SIZE = 11;
const LABEL_OFFSET_Y = 4; // Gap between label and bbox

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

  // Real-time position update during drag
  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setLiveBox((prev) => ({
      ...prev,
      x: node.x(),
      y: node.y(),
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
  const labelWidth = data.labelName.length * 7 + LABEL_PADDING_X * 2;

  // Calculate label position (above the bbox, with small gap)
  const labelX = liveBox.x;
  const labelY = liveBox.y - LABEL_HEIGHT - LABEL_OFFSET_Y;

  return (
    <>
      {/* Label - floats above the bounding box */}
      <Group x={labelX} y={labelY} listening={false}>
        {/* Label background with subtle shadow effect */}
        <Rect
          width={labelWidth}
          height={LABEL_HEIGHT}
          fill={data.labelColor}
          cornerRadius={4}
          shadowColor="rgba(0,0,0,0.3)"
          shadowBlur={4}
          shadowOffsetY={2}
          shadowEnabled={isSelected}
        />
        {/* Label text */}
        <Text
          x={LABEL_PADDING_X}
          y={LABEL_PADDING_Y + 1}
          text={data.labelName}
          fontSize={LABEL_FONT_SIZE}
          fontFamily="system-ui, -apple-system, sans-serif"
          fontStyle="600"
          fill="white"
          letterSpacing={0.3}
        />
      </Group>

      {/* Bounding box - draggable */}
      <Rect
        ref={shapeRef}
        x={data.x}
        y={data.y}
        width={data.width}
        height={data.height}
        stroke={data.labelColor}
        strokeWidth={strokeWidth}
        fill={isSelected ? `${data.labelColor}10` : "transparent"}
        cornerRadius={1}
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
        dragBoundFunc={(pos) => {
          const clamped = clampPosition(pos.x, pos.y, data.width, data.height);
          return clamped;
        }}
      />

      {/* Transformer - only when selected */}
      {isSelected ? (
        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          enabledAnchors={[
            "top-left",
            "top-right",
            "bottom-left",
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
