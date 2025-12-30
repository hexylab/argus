"use client";

import { Rect, Text, Group } from "react-konva";
import type { BoundingBoxData } from "@/types/annotation";

interface BoundingBoxProps {
  data: BoundingBoxData;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function BoundingBox({ data, isSelected, onSelect }: BoundingBoxProps) {
  const strokeWidth = isSelected ? 3 : 2;
  const labelHeight = 20;
  const labelPadding = 4;

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
      />

      {/* Selection handles (corners) - only show when selected */}
      {isSelected ? (
        <>
          {/* Top-left */}
          <Rect
            x={data.x - 4}
            y={data.y - 4}
            width={8}
            height={8}
            fill={data.labelColor}
            stroke="white"
            strokeWidth={1}
          />
          {/* Top-right */}
          <Rect
            x={data.x + data.width - 4}
            y={data.y - 4}
            width={8}
            height={8}
            fill={data.labelColor}
            stroke="white"
            strokeWidth={1}
          />
          {/* Bottom-left */}
          <Rect
            x={data.x - 4}
            y={data.y + data.height - 4}
            width={8}
            height={8}
            fill={data.labelColor}
            stroke="white"
            strokeWidth={1}
          />
          {/* Bottom-right */}
          <Rect
            x={data.x + data.width - 4}
            y={data.y + data.height - 4}
            width={8}
            height={8}
            fill={data.labelColor}
            stroke="white"
            strokeWidth={1}
          />
        </>
      ) : null}
    </Group>
  );
}
