"use client";

import { Rect, Text, Group } from "react-konva";
import { TransformHandles, type TransformBounds } from "./TransformHandles";
import type { BoundingBoxData } from "@/types/annotation";

interface BoundingBoxProps {
  data: BoundingBoxData;
  isSelected: boolean;
  imageWidth: number;
  imageHeight: number;
  onSelect: (id: string) => void;
  onUpdate?: (id: string, newData: Partial<BoundingBoxData>) => void;
  onTransformStart?: () => void;
  onTransformEnd?: () => void;
}

export function BoundingBox({
  data,
  isSelected,
  imageWidth,
  imageHeight,
  onSelect,
  onUpdate,
  onTransformStart,
  onTransformEnd,
}: BoundingBoxProps) {
  const strokeWidth = isSelected ? 3 : 2;
  const labelHeight = 20;
  const labelPadding = 4;

  const handleTransform = (newBounds: TransformBounds) => {
    onUpdate?.(data.id, {
      x: newBounds.x,
      y: newBounds.y,
      width: newBounds.width,
      height: newBounds.height,
    });
  };

  return (
    <Group>
      {/* Label background */}
      <Rect
        x={data.x}
        y={data.y - labelHeight}
        width={data.labelName.length * 8 + labelPadding * 2}
        height={labelHeight}
        fill={data.labelColor}
        cornerRadius={[4, 4, 0, 0]}
      />

      {/* Label text */}
      <Text
        x={data.x + labelPadding}
        y={data.y - labelHeight + 4}
        text={data.labelName}
        fontSize={12}
        fontFamily="system-ui, sans-serif"
        fill="white"
      />

      {/* Bounding box */}
      <Rect
        x={data.x}
        y={data.y}
        width={data.width}
        height={data.height}
        stroke={data.labelColor}
        strokeWidth={strokeWidth}
        fill="transparent"
        onClick={() => onSelect(data.id)}
        onTap={() => onSelect(data.id)}
        hitStrokeWidth={10}
        listening={!isSelected} // Don't listen when selected (TransformHandles handles it)
      />

      {/* Transform handles (only show when selected) */}
      {isSelected ? (
        <TransformHandles
          x={data.x}
          y={data.y}
          width={data.width}
          height={data.height}
          color={data.labelColor}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onTransformStart={onTransformStart ?? (() => {})}
          onTransform={handleTransform}
          onTransformEnd={onTransformEnd ?? (() => {})}
        />
      ) : null}
    </Group>
  );
}
