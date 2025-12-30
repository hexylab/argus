"use client";

import { useState, useCallback } from "react";
import type { Video } from "@/types/video";
import type { Frame } from "@/types/frame";
import { VideoDetail } from "./components/video-detail";
import { ProcessingStatus } from "./components/processing-status";
import { FrameGrid } from "./components/frame-grid";
import { fetchFrames } from "./actions";

interface VideoDetailClientProps {
  video: Video;
  projectId: string;
  initialFrames: Frame[];
}

export function VideoDetailClient({
  video: initialVideo,
  projectId,
  initialFrames,
}: VideoDetailClientProps) {
  const [video, setVideo] = useState(initialVideo);
  const [frames, setFrames] = useState(initialFrames);
  const [isLoadingFrames, setIsLoadingFrames] = useState(false);

  const handleStatusChange = useCallback(
    async (updatedVideo: Video) => {
      setVideo(updatedVideo);

      // Fetch frames when video becomes ready
      if (
        updatedVideo.status === "ready" &&
        initialVideo.status !== "ready" &&
        frames.length === 0
      ) {
        setIsLoadingFrames(true);
        const result = await fetchFrames(projectId, updatedVideo.id);
        if (result.frames) {
          setFrames(result.frames);
        }
        setIsLoadingFrames(false);
      }
    },
    [projectId, initialVideo.status, frames.length]
  );

  return (
    <div className="space-y-6">
      {/* Processing Status */}
      <ProcessingStatus
        video={video}
        projectId={projectId}
        onStatusChange={handleStatusChange}
      />

      {/* Video Details */}
      <VideoDetail video={video} />

      {/* Frame Grid - only show when ready or failed */}
      {(video.status === "ready" || video.status === "failed") && (
        <FrameGrid frames={frames} isLoading={isLoadingFrames} />
      )}
    </div>
  );
}
