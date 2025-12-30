import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { VideoCard } from "@/app/(protected)/projects/[id]/components/video-card";
import type { Video } from "@/types/video";

// Mock the actions module
vi.mock("@/app/(protected)/projects/[id]/actions", () => ({
  removeVideo: vi.fn(),
}));

const createMockVideo = (overrides: Partial<Video> = {}): Video => ({
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
  thumbnail_url: null,
  ...overrides,
});

describe("VideoCard", () => {
  it("renders video filename", () => {
    const video = createMockVideo();

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("test.mp4")).toBeInTheDocument();
  });

  it("displays ready status", () => {
    const video = createMockVideo({ status: "ready" });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("準備完了")).toBeInTheDocument();
  });

  it("displays uploading status with animation", () => {
    const video = createMockVideo({ status: "uploading" });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("アップロード中")).toBeInTheDocument();
  });

  it("displays processing status", () => {
    const video = createMockVideo({ status: "processing" });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("処理中")).toBeInTheDocument();
  });

  it("displays failed status with error message", () => {
    const video = createMockVideo({
      status: "failed",
      error_message: "Frame extraction failed",
    });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("エラー")).toBeInTheDocument();
    expect(screen.getByText("Frame extraction failed")).toBeInTheDocument();
  });

  it("displays file size", () => {
    const video = createMockVideo({ file_size: 1024 * 1024 }); // 1 MB

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("1 MB")).toBeInTheDocument();
  });

  it("displays duration", () => {
    const video = createMockVideo({ duration_seconds: 125 }); // 2:05

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("2:05")).toBeInTheDocument();
  });

  it("displays video dimensions", () => {
    const video = createMockVideo({ width: 1920, height: 1080 });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("1920 x 1080")).toBeInTheDocument();
  });

  it("handles null file size", () => {
    const video = createMockVideo({ file_size: null });

    render(<VideoCard video={video} projectId="project-123" />);

    expect(screen.getByText("-")).toBeInTheDocument();
  });
});
