import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "@/lib/api/client";

describe("apiClient", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    // Clear API_URL to ensure NEXT_PUBLIC_API_URL is used
    vi.stubEnv("API_URL", "");
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it("should make a successful GET request", async () => {
    const mockData = { id: "1", name: "Test" };
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockData),
    });

    const result = await apiClient("/api/v1/test", { method: "GET" });

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/test",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
  });

  it("should include Authorization header when accessToken is provided", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    });

    await apiClient("/api/v1/test", {
      method: "GET",
      accessToken: "test-token",
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("should make a POST request with body", async () => {
    const requestBody = { name: "New Project" };
    const mockResponse = { id: "1", ...requestBody };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve(mockResponse),
    });

    const result = await apiClient("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify(requestBody),
    });

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/v1/projects",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      })
    );
  });

  it("should return null for 204 No Content response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const result = await apiClient("/api/v1/test", { method: "DELETE" });

    expect(result).toBeNull();
  });

  it("should throw ApiError on non-ok response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
    });

    await expect(apiClient("/api/v1/test")).rejects.toThrow(ApiError);
    await expect(apiClient("/api/v1/test")).rejects.toMatchObject({
      status: 401,
      statusText: "Unauthorized",
    });
  });

  it("should throw ApiError on 404 response", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(apiClient("/api/v1/test")).rejects.toThrow(ApiError);
  });
});
