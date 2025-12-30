"use client";

import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

interface ImageLayerProps {
  imageUrl: string;
  onLoad?: (width: number, height: number) => void;
}

export function ImageLayer({ imageUrl, onLoad }: ImageLayerProps) {
  const [image, status] = useImage(imageUrl, "anonymous");

  // Notify parent when image loads
  if (status === "loaded" && image && onLoad) {
    onLoad(image.width, image.height);
  }

  if (status === "loading") {
    return null;
  }

  if (status === "failed") {
    return null;
  }

  return <KonvaImage image={image} x={0} y={0} />;
}
