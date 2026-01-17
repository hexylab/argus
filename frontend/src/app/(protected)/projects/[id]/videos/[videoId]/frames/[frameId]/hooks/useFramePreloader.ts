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

// Generous preloading in both directions
const PRELOAD_COUNT = 25;
// Limit concurrent requests to avoid overwhelming the server
const MAX_CONCURRENT_PRELOADS = 3;

export function useFramePreloader({
  frames,
  currentFrameId,
  projectId,
  videoId,
  fetchFrameData,
}: UseFramePreloaderProps): UseFramePreloaderReturn {
  const cacheRef = useRef<Map<string, PreloadedFrame>>(new Map());
  const preloadingRef = useRef<Set<string>>(new Set());
  const preloadQueueRef = useRef<string[]>([]);

  // Get current frame index
  const currentIndex = frames.findIndex((f) => f.id === currentFrameId);

  // Process preload queue with concurrency limit
  const processQueue = useCallback(async () => {
    while (
      preloadQueueRef.current.length > 0 &&
      preloadingRef.current.size < MAX_CONCURRENT_PRELOADS
    ) {
      const frameId = preloadQueueRef.current.shift();
      if (!frameId) continue;

      // Skip if already cached or currently preloading
      if (cacheRef.current.has(frameId) || preloadingRef.current.has(frameId)) {
        continue;
      }

      preloadingRef.current.add(frameId);

      // Start preload without awaiting (fire and forget for concurrency)
      fetchFrameData(projectId, videoId, frameId)
        .then((result) => {
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
        })
        .catch((error) => {
          console.error(`Failed to preload frame ${frameId}:`, error);
        })
        .finally(() => {
          preloadingRef.current.delete(frameId);
          // Process next item in queue
          processQueue();
        });
    }
  }, [projectId, videoId, fetchFrameData]);

  // Add frames to preload queue (sorted by distance from current)
  const queuePreload = useCallback(
    (frameIds: string[]) => {
      // Filter out already cached or queued frames
      const newFrames = frameIds.filter(
        (id) =>
          !cacheRef.current.has(id) &&
          !preloadingRef.current.has(id) &&
          !preloadQueueRef.current.includes(id)
      );

      // Add to queue
      preloadQueueRef.current.push(...newFrames);

      // Start processing
      processQueue();
    },
    [processQueue]
  );

  // Preload adjacent frames when current frame changes
  useEffect(() => {
    if (currentIndex === -1 || frames.length === 0) return;

    // Clear existing queue and reprioritize based on new position
    preloadQueueRef.current = [];

    // Build list of frames sorted by distance from current position
    // This ensures closest frames are loaded first
    const framesToPreload: { id: string; distance: number }[] = [];

    for (let i = 1; i <= PRELOAD_COUNT; i++) {
      // Next frames (slightly prioritized over previous)
      if (currentIndex + i < frames.length) {
        framesToPreload.push({
          id: frames[currentIndex + i].id,
          distance: i - 0.1, // Slight priority for forward direction
        });
      }
      // Previous frames
      if (currentIndex - i >= 0) {
        framesToPreload.push({
          id: frames[currentIndex - i].id,
          distance: i,
        });
      }
    }

    // Sort by distance (closest first)
    framesToPreload.sort((a, b) => a.distance - b.distance);

    // Queue all frames for preload
    queuePreload(framesToPreload.map((f) => f.id));
  }, [currentIndex, frames, queuePreload]);

  // Clean up old cache entries to prevent memory issues
  useEffect(() => {
    const maxCacheSize = PRELOAD_COUNT * 2 + 10;

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
