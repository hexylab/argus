import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVideos,
  getVideo,
  getUploadUrl,
  completeUpload,
  deleteVideo,
} from "@/lib/api/videos";
import type { Video, UploadUrlResponse } from "@/types/video";

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
  thumbnail_url: null,
};

const mockUploadUrlResponse: UploadUrlResponse = {
  video_id: "video-123",
  upload_url: "https://s3.amazonaws.com/bucket/key?presigned",
  s3_key: "projects/project-123/videos/video-123/test.mp4",
  expires_in: 3600,
};

describe("videos API client", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  });

  describe("getVideos", () => {
    it("should fetch videos for a project", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockVideo]),
      });
      global.fetch = mockFetch;

      const result = await getVideos("test-token", "project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
      expect(result).toEqual([mockVideo]);
    });

    it("should include pagination parameters", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });
      global.fetch = mockFetch;

      await getVideos("test-token", "project-123", { skip: 10, limit: 5 });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos?skip=10&limit=5",
        expect.any(Object)
      );
    });
  });

  describe("getVideo", () => {
    it("should fetch a single video", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockVideo),
      });
      global.fetch = mockFetch;

      const result = await getVideo("test-token", "project-123", "video-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos/video-123",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
      expect(result).toEqual(mockVideo);
    });
  });

  describe("getUploadUrl", () => {
    it("should request a presigned upload URL", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockUploadUrlResponse),
      });
      global.fetch = mockFetch;

      const result = await getUploadUrl("test-token", "project-123", {
        filename: "test.mp4",
        mime_type: "video/mp4",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos/upload-url",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            filename: "test.mp4",
            mime_type: "video/mp4",
          }),
        })
      );
      expect(result).toEqual(mockUploadUrlResponse);
    });
  });

  describe("completeUpload", () => {
    it("should mark upload as complete", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ ...mockVideo, status: "processing" }),
      });
      global.fetch = mockFetch;

      const result = await completeUpload(
        "test-token",
        "project-123",
        "video-123",
        { file_size: 1024000 }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos/video-123/complete",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
          body: JSON.stringify({ file_size: 1024000 }),
        })
      );
      expect(result.status).toBe("processing");
    });
  });

  describe("deleteVideo", () => {
    it("should delete a video", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      global.fetch = mockFetch;

      await deleteVideo("test-token", "project-123", "video-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects/project-123/videos/video-123",
        expect.objectContaining({
          method: "DELETE",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });
});
