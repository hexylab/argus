import { apiClient } from "./client";
import type {
  Video,
  UploadUrlRequest,
  UploadUrlResponse,
  UploadCompleteRequest,
  VideoListParams,
  CheckFilenameRequest,
  CheckFilenameResponse,
} from "@/types/video";

export async function getVideos(
  accessToken: string,
  projectId: string,
  params: VideoListParams = {}
): Promise<Video[]> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/api/v1/projects/${projectId}/videos${query ? `?${query}` : ""}`;

  return apiClient<Video[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function getVideo(
  accessToken: string,
  projectId: string,
  videoId: string
): Promise<Video> {
  return apiClient<Video>(`/api/v1/projects/${projectId}/videos/${videoId}`, {
    method: "GET",
    accessToken,
  });
}

export async function getUploadUrl(
  accessToken: string,
  projectId: string,
  data: UploadUrlRequest
): Promise<UploadUrlResponse> {
  return apiClient<UploadUrlResponse>(
    `/api/v1/projects/${projectId}/videos/upload-url`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(data),
    }
  );
}

export async function completeUpload(
  accessToken: string,
  projectId: string,
  videoId: string,
  data: UploadCompleteRequest = {}
): Promise<Video> {
  return apiClient<Video>(
    `/api/v1/projects/${projectId}/videos/${videoId}/complete`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(data),
    }
  );
}

export async function deleteVideo(
  accessToken: string,
  projectId: string,
  videoId: string
): Promise<void> {
  return apiClient<void>(`/api/v1/projects/${projectId}/videos/${videoId}`, {
    method: "DELETE",
    accessToken,
  });
}

export async function checkFilename(
  accessToken: string,
  projectId: string,
  data: CheckFilenameRequest
): Promise<CheckFilenameResponse> {
  return apiClient<CheckFilenameResponse>(
    `/api/v1/projects/${projectId}/videos/check-filename`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(data),
    }
  );
}
