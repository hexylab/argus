"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Stage,
  Layer,
  Rect,
  Transformer,
  Group,
  Text,
  Image,
} from "react-konva";
import type { Stage as StageType } from "konva/lib/Stage";
import type Konva from "konva";
import useImage from "use-image";
import type { Label } from "@/types/label";

interface EditableBBox {
  x: number;
  y: number;
  width: number;
  height: number;
  labelId: string;
  labelName: string;
  labelColor: string;
}

interface QuickReviewEditCanvasProps {
  imageUrl: string;
  bbox: EditableBBox;
  labels: Label[];
  onChange: (bbox: EditableBBox) => void;
}

const MIN_SIZE = 10;
const LABEL_HEIGHT = 20;
const LABEL_PADDING_X = 6;
const LABEL_FONT_SIZE = 12;

function ImageLayer({
  imageUrl,
  onLoad,
}: {
  imageUrl: string;
  onLoad: (width: number, height: number) => void;
}) {
  const [image, status] = useImage(imageUrl, "anonymous");

  useEffect(() => {
    if (status === "loaded" && image) {
      onLoad(image.width, image.height);
    }
  }, [status, image, onLoad]);

  if (status !== "loaded" || !image) {
    return null;
  }

  // react-konva Image does not need alt attribute
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image image={image} x={0} y={0} />;
}

export function QuickReviewEditCanvas({
  imageUrl,
  bbox,
  labels: _labels,
  onChange,
}: QuickReviewEditCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<StageType>(null);
  const rectRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);

  const [stageSize, setStageSize] = useState({ width: 800, height: 450 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Live bbox position for label sync
  const [liveBox, setLiveBox] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

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

  // Attach transformer
  useEffect(() => {
    if (transformerRef.current && rectRef.current && !isLoading) {
      transformerRef.current.nodes([rectRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isLoading]);

  // Handle image load
  const handleImageLoad = useCallback(
    (width: number, height: number) => {
      setImageSize({ width, height });
      setIsLoading(false);

      // Calculate scale to fit image in canvas
      const padding = 20;
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

      // Convert normalized bbox to pixel coordinates
      const pixelBox = {
        x: bbox.x * width,
        y: bbox.y * height,
        width: bbox.width * width,
        height: bbox.height * height,
      };
      setLiveBox(pixelBox);
    },
    [stageSize.width, stageSize.height, bbox]
  );

  // Clamp position within image bounds
  const clampPosition = useCallback(
    (x: number, y: number, w: number, h: number) => {
      return {
        x: Math.max(0, Math.min(x, imageSize.width - w)),
        y: Math.max(0, Math.min(y, imageSize.height - h)),
      };
    },
    [imageSize]
  );

  // Handle drag
  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    setLiveBox((prev) => ({
      ...prev,
      x: node.x(),
      y: node.y(),
    }));
  }, []);

  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      const clamped = clampPosition(
        node.x(),
        node.y(),
        liveBox.width,
        liveBox.height
      );

      node.position(clamped);
      setLiveBox((prev) => ({
        ...prev,
        x: clamped.x,
        y: clamped.y,
      }));

      // Notify parent with normalized coordinates
      if (imageSize.width > 0 && imageSize.height > 0) {
        onChange({
          ...bbox,
          x: clamped.x / imageSize.width,
          y: clamped.y / imageSize.height,
        });
      }
    },
    [clampPosition, liveBox.width, liveBox.height, imageSize, onChange, bbox]
  );

  // Handle transform
  const handleTransform = useCallback(() => {
    const node = rectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    setLiveBox({
      x: node.x(),
      y: node.y(),
      width: node.width() * scaleX,
      height: node.height() * scaleY,
    });
  }, []);

  const handleTransformEnd = useCallback(() => {
    const node = rectRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(MIN_SIZE, node.width() * scaleX);
    const newHeight = Math.max(MIN_SIZE, node.height() * scaleY);
    const clamped = clampPosition(node.x(), node.y(), newWidth, newHeight);

    node.width(newWidth);
    node.height(newHeight);
    node.position(clamped);

    setLiveBox({
      x: clamped.x,
      y: clamped.y,
      width: newWidth,
      height: newHeight,
    });

    // Notify parent with normalized coordinates
    if (imageSize.width > 0 && imageSize.height > 0) {
      onChange({
        ...bbox,
        x: clamped.x / imageSize.width,
        y: clamped.y / imageSize.height,
        width: newWidth / imageSize.width,
        height: newHeight / imageSize.height,
      });
    }
  }, [clampPosition, imageSize, onChange, bbox]);

  // Keyboard shortcuts for fine adjustment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const step = e.shiftKey ? 10 : 1;
      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowLeft":
          dx = -step;
          break;
        case "ArrowRight":
          dx = step;
          break;
        case "ArrowUp":
          dy = -step;
          break;
        case "ArrowDown":
          dy = step;
          break;
        default:
          return;
      }

      e.preventDefault();

      const newX = liveBox.x + dx;
      const newY = liveBox.y + dy;
      const clamped = clampPosition(newX, newY, liveBox.width, liveBox.height);

      setLiveBox((prev) => ({
        ...prev,
        x: clamped.x,
        y: clamped.y,
      }));

      // Also update the rect position
      if (rectRef.current) {
        rectRef.current.position(clamped);
        rectRef.current.getLayer()?.batchDraw();
      }

      // Notify parent with normalized coordinates
      if (imageSize.width > 0 && imageSize.height > 0) {
        onChange({
          ...bbox,
          x: clamped.x / imageSize.width,
          y: clamped.y / imageSize.height,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [liveBox, clampPosition, imageSize, onChange, bbox]);

  // Label rendering
  const labelWidth = bbox.labelName.length * 8 + LABEL_PADDING_X * 2;
  const labelX = liveBox.x;
  const labelY = liveBox.y - LABEL_HEIGHT;

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {isLoading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="size-6 animate-spin text-muted-foreground"
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
            <span className="text-xs text-muted-foreground">読み込み中...</span>
          </div>
        </div>
      ) : null}

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        style={{
          backgroundColor: "hsl(var(--muted))",
        }}
      >
        {/* Image layer */}
        <Layer>
          <ImageLayer imageUrl={imageUrl} onLoad={handleImageLoad} />
        </Layer>

        {/* Annotation layer */}
        {!isLoading && (
          <Layer>
            {/* Label */}
            <Group x={labelX} y={labelY} listening={false}>
              <Rect
                width={labelWidth}
                height={LABEL_HEIGHT}
                fill={bbox.labelColor}
                cornerRadius={[4, 4, 0, 0]}
              />
              <Text
                x={LABEL_PADDING_X}
                y={4}
                text={bbox.labelName}
                fontSize={LABEL_FONT_SIZE}
                fontFamily="system-ui, sans-serif"
                fill="white"
              />
            </Group>

            {/* Bounding box */}
            <Rect
              ref={rectRef}
              x={liveBox.x}
              y={liveBox.y}
              width={liveBox.width}
              height={liveBox.height}
              stroke={bbox.labelColor}
              strokeWidth={2.5}
              fill="transparent"
              draggable
              onDragMove={handleDragMove}
              onDragEnd={handleDragEnd}
              onTransform={handleTransform}
              onTransformEnd={handleTransformEnd}
              hitStrokeWidth={10}
              dragBoundFunc={(pos) => {
                return clampPosition(
                  pos.x,
                  pos.y,
                  liveBox.width,
                  liveBox.height
                );
              }}
            />

            {/* Transformer */}
            <Transformer
              ref={transformerRef}
              rotateEnabled={false}
              enabledAnchors={[
                "top-left",
                "top-right",
                "bottom-left",
                "bottom-right",
              ]}
              anchorSize={12}
              anchorCornerRadius={3}
              anchorStroke={bbox.labelColor}
              anchorFill="white"
              anchorStrokeWidth={2}
              borderStroke={bbox.labelColor}
              borderStrokeWidth={0}
              borderDash={[]}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < MIN_SIZE || newBox.height < MIN_SIZE) {
                  return oldBox;
                }
                if (
                  newBox.x < 0 ||
                  newBox.y < 0 ||
                  newBox.x + newBox.width > imageSize.width ||
                  newBox.y + newBox.height > imageSize.height
                ) {
                  return oldBox;
                }
                return newBox;
              }}
            />
          </Layer>
        )}
      </Stage>

      {/* Hint */}
      <div className="absolute bottom-2 left-2 px-2 py-1 bg-background/80 backdrop-blur-sm rounded text-xs text-muted-foreground">
        ドラッグで移動 / 角をドラッグでリサイズ / 矢印キーで微調整
      </div>
    </div>
  );
}
