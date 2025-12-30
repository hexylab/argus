"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Frame } from "@/types/frame";

interface FrameStripProps {
  frames: Frame[];
  currentFrameId: string;
  projectId: string;
  videoId: string;
}

export function FrameStrip({
  frames,
  currentFrameId,
  projectId,
  videoId,
}: FrameStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (currentRef.current && containerRef.current) {
      const container = containerRef.current;
      const current = currentRef.current;

      const scrollLeft =
        current.offsetLeft -
        container.offsetWidth / 2 +
        current.offsetWidth / 2;

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      });
    }
  }, [currentFrameId]);

  if (frames.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex gap-1 overflow-x-auto py-2 px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent"
    >
      {frames.map((frame) => {
        const isCurrent = frame.id === currentFrameId;
        return (
          <Link
            key={frame.id}
            ref={isCurrent ? currentRef : undefined}
            href={`/projects/${projectId}/videos/${videoId}/frames/${frame.id}`}
            className={cn(
              "flex-shrink-0 relative rounded overflow-hidden transition-all",
              "hover:ring-2 hover:ring-primary/50",
              isCurrent && "ring-2 ring-primary"
            )}
          >
            <FrameThumbnail frame={frame} isCurrent={isCurrent} />
          </Link>
        );
      })}
    </div>
  );
}

interface FrameThumbnailProps {
  frame: Frame;
  isCurrent: boolean;
}

function FrameThumbnail({ frame, isCurrent }: FrameThumbnailProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <div
      className={cn(
        "w-16 h-12 relative",
        isCurrent && "opacity-100",
        !isCurrent && "opacity-70 hover:opacity-100"
      )}
    >
      {frame.thumbnail_url && !imageError ? (
        <Image
          src={frame.thumbnail_url}
          alt={`Frame ${frame.frame_number}`}
          fill
          className="object-cover"
          sizes="64px"
          onError={() => setImageError(true)}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <span className="text-xs text-muted-foreground">
            {frame.frame_number}
          </span>
        </div>
      )}
      {isCurrent ? (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
      ) : null}
    </div>
  );
}
