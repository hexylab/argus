import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoList } from "@/app/(protected)/projects/[id]/components/video-list";
import type { Video } from "@/types/video";

const mockVideo: Video = {
  id: "video-123",
  project_id: "project-123",
  filename: "test.mp4",
  original_filename: "test.mp4",
  s3_key: "projects/project-123/videos/video-123/test.mp4",
  mime_type: "video/mp4",
  file_size: 1024000,
  duration_seconds: 120.5,
  width: 1920,
  height: 1080,
  fps: 30,
  frame_count: 3615,
  status: "ready",
  error_message: null,
  metadata: {},
  created_at: "2024-01-01T00:00:00Z",
};

describe("VideoList", () => {
  it("renders empty state when no videos", () => {
    render(<VideoList videos={[]} projectId="project-123" />);

    expect(screen.getByText("映像がありません")).toBeInTheDocument();
    expect(
      screen.getByText(/上のエリアに映像ファイルをドラッグ/)
    ).toBeInTheDocument();
  });

  it("renders video cards when videos exist", () => {
    const videos = [
      mockVideo,
      { ...mockVideo, id: "video-456", original_filename: "another.mp4" },
    ];

    render(<VideoList videos={videos} projectId="project-123" />);

    expect(screen.getByText("test.mp4")).toBeInTheDocument();
    expect(screen.getByText("another.mp4")).toBeInTheDocument();
  });

  it("renders grid layout", () => {
    const videos = [mockVideo];

    const { container } = render(
      <VideoList videos={videos} projectId="project-123" />
    );

    const grid = container.querySelector(".grid");
    expect(grid).toBeInTheDocument();
    expect(grid).toHaveClass("sm:grid-cols-2", "lg:grid-cols-3");
  });
});
