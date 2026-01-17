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
  scale: number;
  showLabel: boolean;
  onSelect: (id: string) => void;
  onTransformStart?: () => void;
  onTransformEnd?: (id: string, result: TransformResult) => void;
  onDragStart?: () => void;
  onDragEnd?: (id: string, result: TransformResult) => void;
}

const MIN_SIZE = 10;
// Base values that will be divided by scale to maintain consistent visual size
const BASE_STROKE_WIDTH = 2;
const BASE_STROKE_WIDTH_SELECTED = 2.5;
const BASE_LABEL_HEIGHT = 20;
const BASE_LABEL_PADDING_X = 6;
const BASE_LABEL_FONT_SIZE = 12;
const BASE_DIMENSION_LABEL_HEIGHT = 18;
const BASE_DIMENSION_LABEL_PADDING = 4;
const BASE_ANCHOR_SIZE = 10;
const BASE_HIT_STROKE_WIDTH = 10;

export function BoundingBox({
  data,
  isSelected,
  imageWidth,
  imageHeight,
  scale,
  showLabel,
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

  // strokeScaleEnabled={false} により、ストロークはスケール変換に影響されないため
  // 手動でのスケール補正は不要（二重補正を避ける）
  const strokeWidth = isSelected
    ? BASE_STROKE_WIDTH_SELECTED
    : BASE_STROKE_WIDTH;
  const labelHeight = BASE_LABEL_HEIGHT / scale;
  const labelPaddingX = BASE_LABEL_PADDING_X / scale;
  const labelFontSize = BASE_LABEL_FONT_SIZE / scale;
  const dimensionLabelHeight = BASE_DIMENSION_LABEL_HEIGHT / scale;
  const dimensionLabelPadding = BASE_DIMENSION_LABEL_PADDING / scale;
  const hitStrokeWidth = BASE_HIT_STROKE_WIDTH / scale;

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

    // Calculate new dimensions with minimum size
    let newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
    let newHeight = Math.max(MIN_SIZE, node.height() * scaleY);

    // Get current position
    let newX = node.x();
    let newY = node.y();

    // Clamp size to image bounds
    newWidth = Math.min(newWidth, imageWidth);
    newHeight = Math.min(newHeight, imageHeight);

    // Clamp position to keep box within image bounds
    newX = Math.max(0, Math.min(newX, imageWidth - newWidth));
    newY = Math.max(0, Math.min(newY, imageHeight - newHeight));

    // Apply clamped values back to the node
    node.x(newX);
    node.y(newY);
    node.width(newWidth);
    node.height(newHeight);

    // Update live box
    setLiveBox({
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });

    onTransformEnd?.(data.id, {
      x: newX,
      y: newY,
      width: newWidth,
      height: newHeight,
    });
  };

  // Calculate label width based on text (scale-independent)
  const charWidth = 8 / scale;
  const labelWidth = data.labelName.length * charWidth + labelPaddingX * 2;

  // Calculate label position (adjacent to bbox, no gap)
  const labelX = liveBox.x;
  const labelY = liveBox.y - labelHeight;

  // Dimension label text during transform (scale-independent)
  const dimensionText = `${Math.round(liveBox.width)} × ${Math.round(liveBox.height)}`;
  const dimensionCharWidth = 7 / scale;
  const dimensionLabelWidth =
    dimensionText.length * dimensionCharWidth + dimensionLabelPadding * 2;

  // Corner radius scaled
  const labelCornerRadius = 4 / scale;
  const dimensionCornerRadius = 3 / scale;

  return (
    <>
      {/* Label - adjacent to the bounding box (conditionally shown) */}
      {showLabel ? (
        <Group x={labelX} y={labelY} listening={false}>
          <Rect
            width={labelWidth}
            height={labelHeight}
            fill={data.labelColor}
            cornerRadius={[labelCornerRadius, labelCornerRadius, 0, 0]}
          />
          <Text
            x={labelPaddingX}
            y={4 / scale}
            text={data.labelName}
            fontSize={labelFontSize}
            fontFamily="system-ui, sans-serif"
            fill="white"
          />
        </Group>
      ) : null}

      {/* Dimension label - shown during transform */}
      {isTransforming ? (
        <Group
          x={liveBox.x + liveBox.width - dimensionLabelWidth}
          y={liveBox.y + liveBox.height + 4 / scale}
          listening={false}
        >
          <Rect
            width={dimensionLabelWidth}
            height={dimensionLabelHeight}
            fill="rgba(0, 0, 0, 0.75)"
            cornerRadius={dimensionCornerRadius}
          />
          <Text
            x={dimensionLabelPadding}
            y={3 / scale}
            text={dimensionText}
            fontSize={11 / scale}
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
        strokeScaleEnabled={false}
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
        hitStrokeWidth={hitStrokeWidth}
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
          anchorSize={BASE_ANCHOR_SIZE}
          anchorScaleX={1 / scale}
          anchorScaleY={1 / scale}
          anchorCornerRadius={3}
          anchorStroke={data.labelColor}
          anchorFill="white"
          anchorStrokeWidth={1.5}
          borderStroke={data.labelColor}
          borderStrokeWidth={0}
          borderDash={[]}
          ignoreStroke={true}
        />
      ) : null}
    </>
  );
}
