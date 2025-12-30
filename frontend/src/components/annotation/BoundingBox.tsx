"use client";

import { useRef, useEffect } from "react";
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

  const strokeWidth = isSelected ? 3 : 2;
  const labelHeight = 20;
  const labelPadding = 4;

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

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const clamped = clampPosition(node.x(), node.y(), data.width, data.height);

    // Apply clamped position
    node.position(clamped);

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

    onTransformEnd?.(data.id, {
      x: clamped.x,
      y: clamped.y,
      width: newWidth,
      height: newHeight,
    });
  };

  return (
    <>
      {/* Label background and text */}
      <Group x={data.x} y={data.y - labelHeight} listening={false}>
        <Rect
          width={data.labelName.length * 8 + labelPadding * 2}
          height={labelHeight}
          fill={data.labelColor}
          cornerRadius={[4, 4, 0, 0]}
        />
        <Text
          x={labelPadding}
          y={4}
          text={data.labelName}
          fontSize={12}
          fontFamily="system-ui, sans-serif"
          fill="white"
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
        fill="transparent"
        draggable
        onClick={() => onSelect(data.id)}
        onTap={() => onSelect(data.id)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformStart={handleTransformStart}
        onTransformEnd={handleTransformEnd}
        hitStrokeWidth={10}
        dragBoundFunc={(pos) => {
          // Clamp during drag
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
          anchorCornerRadius={2}
          anchorStroke={data.labelColor}
          anchorFill="white"
          anchorStrokeWidth={1}
          borderStroke={data.labelColor}
          borderStrokeWidth={2}
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
