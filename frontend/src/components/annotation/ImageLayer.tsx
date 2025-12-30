"use client";

import { useEffect, useRef } from "react";
import { Image as KonvaImage } from "react-konva";
import useImage from "use-image";

interface ImageLayerProps {
  imageUrl: string;
  onLoad?: (width: number, height: number) => void;
}

export function ImageLayer({ imageUrl, onLoad }: ImageLayerProps) {
  const [image, status] = useImage(imageUrl, "anonymous");
  const hasNotifiedRef = useRef(false);

  // Notify parent when image loads (only once)
  useEffect(() => {
    if (status === "loaded" && image && onLoad && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true;
      onLoad(image.width, image.height);
    }
  }, [status, image, onLoad]);

  // Reset notification flag when URL changes
  useEffect(() => {
    hasNotifiedRef.current = false;
  }, [imageUrl]);

  if (status === "loading" || status === "failed") {
    return null;
  }

  return <KonvaImage image={image} x={0} y={0} />;
}
