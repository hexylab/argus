"use client";

import dynamic from "next/dynamic";
import type { FrameDetail } from "@/types/frame";

const AnnotationCanvas = dynamic(
  () =>
    import("@/components/annotation/AnnotationCanvas").then(
      (mod) => mod.AnnotationCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-muted/30">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="size-8 animate-spin text-muted-foreground"
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
          <span className="text-sm text-muted-foreground">
            キャンバスを読み込み中...
          </span>
        </div>
      </div>
    ),
  }
);

interface AnnotationClientProps {
  frame: FrameDetail;
}

export function AnnotationClient({ frame }: AnnotationClientProps) {
  return (
    <AnnotationCanvas
      imageUrl={frame.image_url}
      initialWidth={frame.width ?? undefined}
      initialHeight={frame.height ?? undefined}
    />
  );
}
