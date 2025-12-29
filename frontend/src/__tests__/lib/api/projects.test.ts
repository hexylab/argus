import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getProjects, createProject } from "@/lib/api/projects";
import type { Project } from "@/types/project";

describe("Projects API", () => {
  const originalFetch = global.fetch;

  const mockProject: Project = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    owner_id: "user-123",
    name: "Test Project",
    description: "Test description",
    status: "active",
    settings: {},
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    // Clear API_URL to ensure NEXT_PUBLIC_API_URL is used
    vi.stubEnv("API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  describe("getProjects", () => {
    it("should fetch projects successfully", async () => {
      const mockProjects = [mockProject];
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockProjects),
      });

      const result = await getProjects("test-token");

      expect(result).toEqual(mockProjects);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });

    it("should include pagination params when provided", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getProjects("test-token", { skip: 10, limit: 5 });

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects?skip=10&limit=5",
        expect.any(Object)
      );
    });

    it("should handle skip=0 correctly", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve([]),
      });

      await getProjects("test-token", { skip: 0 });

      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects?skip=0",
        expect.any(Object)
      );
    });

    it("should throw on 401 Unauthorized", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      await expect(getProjects("invalid-token")).rejects.toThrow();
    });
  });

  describe("createProject", () => {
    it("should create a project successfully", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve(mockProject),
      });

      const result = await createProject("test-token", {
        name: "Test Project",
        description: "Test description",
      });

      expect(result).toEqual(mockProject);
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            name: "Test Project",
            description: "Test description",
          }),
        })
      );
    });

    it("should create a project with minimal data", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ ...mockProject, description: null }),
      });

      const result = await createProject("test-token", {
        name: "Minimal Project",
      });

      expect(result.name).toBe("Test Project");
      expect(fetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/projects",
        expect.objectContaining({
          body: JSON.stringify({ name: "Minimal Project" }),
        })
      );
    });

    it("should throw on validation error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: "Unprocessable Entity",
      });

      await expect(createProject("test-token", { name: "" })).rejects.toThrow();
    });
  });
});
