"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { Frame } from "@/types/frame";

interface FrameNavigatorProps {
  frames: Frame[];
  currentFrameId: string;
  projectId: string;
  videoId: string;
  disabled?: boolean;
}

export function FrameNavigator({
  frames,
  currentFrameId,
  projectId,
  videoId,
  disabled = false,
}: FrameNavigatorProps) {
  const router = useRouter();

  const currentIndex = frames.findIndex((f) => f.id === currentFrameId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < frames.length - 1;

  const navigateTo = useCallback(
    (frameId: string) => {
      router.push(`/projects/${projectId}/videos/${videoId}/frames/${frameId}`);
    },
    [router, projectId, videoId]
  );

  const goToPrevious = useCallback(() => {
    if (hasPrevious && !disabled) {
      navigateTo(frames[currentIndex - 1].id);
    }
  }, [hasPrevious, disabled, navigateTo, frames, currentIndex]);

  const goToNext = useCallback(() => {
    if (hasNext && !disabled) {
      navigateTo(frames[currentIndex + 1].id);
    }
  }, [hasNext, disabled, navigateTo, frames, currentIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goToPrevious, goToNext]);

  if (frames.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={goToPrevious}
        disabled={!hasPrevious || disabled}
        className="gap-1"
      >
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 19.5L8.25 12l7.5-7.5"
          />
        </svg>
        <span className="sr-only sm:not-sr-only">前へ</span>
      </Button>

      <span className="text-sm text-muted-foreground min-w-[80px] text-center">
        {currentIndex + 1} / {frames.length}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={goToNext}
        disabled={!hasNext || disabled}
        className="gap-1"
      >
        <span className="sr-only sm:not-sr-only">次へ</span>
        <svg
          className="size-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8.25 4.5l7.5 7.5-7.5 7.5"
          />
        </svg>
      </Button>
    </div>
  );
}
