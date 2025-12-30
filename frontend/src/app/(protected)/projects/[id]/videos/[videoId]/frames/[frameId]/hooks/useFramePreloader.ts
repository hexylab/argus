"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Frame, FrameDetail } from "@/types/frame";
import type { Annotation } from "@/types/annotation";

interface PreloadedFrame {
  frame: FrameDetail;
  annotations: Annotation[];
}

interface UseFramePreloaderProps {
  frames: Frame[];
  currentFrameId: string;
  projectId: string;
  videoId: string;
  fetchFrameData: (
    projectId: string,
    videoId: string,
    frameId: string
  ) => Promise<{ frame?: FrameDetail; annotations?: Annotation[] }>;
}

interface UseFramePreloaderReturn {
  getPreloadedFrame: (frameId: string) => PreloadedFrame | undefined;
  isPreloaded: (frameId: string) => boolean;
}

const PRELOAD_COUNT = 3; // Number of frames to preload in each direction

export function useFramePreloader({
  frames,
  currentFrameId,
  projectId,
  videoId,
  fetchFrameData,
}: UseFramePreloaderProps): UseFramePreloaderReturn {
  const cacheRef = useRef<Map<string, PreloadedFrame>>(new Map());
  const preloadingRef = useRef<Set<string>>(new Set());

  // Get current frame index
  const currentIndex = frames.findIndex((f) => f.id === currentFrameId);

  // Preload a single frame
  const preloadFrame = useCallback(
    async (frameId: string) => {
      // Skip if already cached or currently preloading
      if (cacheRef.current.has(frameId) || preloadingRef.current.has(frameId)) {
        return;
      }

      preloadingRef.current.add(frameId);

      try {
        const result = await fetchFrameData(projectId, videoId, frameId);

        if (result.frame) {
          // Cache the frame data
          cacheRef.current.set(frameId, {
            frame: result.frame,
            annotations: result.annotations ?? [],
          });

          // Preload the image into browser cache
          const img = new Image();
          img.src = result.frame.image_url;
        }
      } catch (error) {
        console.error(`Failed to preload frame ${frameId}:`, error);
      } finally {
        preloadingRef.current.delete(frameId);
      }
    },
    [projectId, videoId, fetchFrameData]
  );

  // Preload adjacent frames when current frame changes
  useEffect(() => {
    if (currentIndex === -1 || frames.length === 0) return;

    // Determine frames to preload
    const framesToPreload: string[] = [];

    // Add next frames
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < frames.length) {
        framesToPreload.push(frames[nextIndex].id);
      }
    }

    // Add previous frames
    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      const prevIndex = currentIndex - i;
      if (prevIndex >= 0) {
        framesToPreload.push(frames[prevIndex].id);
      }
    }

    // Preload frames in priority order (closer frames first)
    for (const frameId of framesToPreload) {
      preloadFrame(frameId);
    }
  }, [currentIndex, frames, preloadFrame]);

  // Clean up old cache entries to prevent memory issues
  useEffect(() => {
    const maxCacheSize = PRELOAD_COUNT * 2 + 5; // Keep a reasonable cache size

    if (cacheRef.current.size > maxCacheSize) {
      const currentCacheKeys = Array.from(cacheRef.current.keys());
      const framesToKeep = new Set<string>();

      // Keep current frame and adjacent frames
      framesToKeep.add(currentFrameId);
      for (let i = 1; i <= PRELOAD_COUNT; i++) {
        if (currentIndex + i < frames.length) {
          framesToKeep.add(frames[currentIndex + i].id);
        }
        if (currentIndex - i >= 0) {
          framesToKeep.add(frames[currentIndex - i].id);
        }
      }

      // Remove frames that are no longer needed
      for (const key of currentCacheKeys) {
        if (!framesToKeep.has(key)) {
          cacheRef.current.delete(key);
        }
      }
    }
  }, [currentFrameId, currentIndex, frames]);

  const getPreloadedFrame = useCallback((frameId: string) => {
    return cacheRef.current.get(frameId);
  }, []);

  const isPreloaded = useCallback((frameId: string) => {
    return cacheRef.current.has(frameId);
  }, []);

  return {
    getPreloadedFrame,
    isPreloaded,
  };
}
