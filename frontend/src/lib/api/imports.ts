import { apiClient } from "./client";
import type {
  ImportJob,
  ImportPreviewResponse,
  ImportUploadUrlRequest,
  ImportUploadUrlResponse,
  StartImportRequest,
} from "@/types/import";

export async function getImportUploadUrl(
  accessToken: string,
  projectId: string,
  data: ImportUploadUrlRequest
): Promise<ImportUploadUrlResponse> {
  return apiClient<ImportUploadUrlResponse>(
    `/api/v1/projects/${projectId}/imports/upload-url`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(data),
    }
  );
}

export async function previewImport(
  accessToken: string,
  projectId: string,
  importJobId: string
): Promise<ImportPreviewResponse> {
  return apiClient<ImportPreviewResponse>(
    `/api/v1/projects/${projectId}/imports/${importJobId}/preview`,
    {
      method: "POST",
      accessToken,
    }
  );
}

export async function startImport(
  accessToken: string,
  projectId: string,
  importJobId: string,
  data: StartImportRequest = {}
): Promise<ImportJob> {
  return apiClient<ImportJob>(
    `/api/v1/projects/${projectId}/imports/${importJobId}/start`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(data),
    }
  );
}

export async function getImportStatus(
  accessToken: string,
  projectId: string,
  importJobId: string
): Promise<ImportJob> {
  return apiClient<ImportJob>(
    `/api/v1/projects/${projectId}/imports/${importJobId}`,
    {
      method: "GET",
      accessToken,
    }
  );
}

export async function getImportJobs(
  accessToken: string,
  projectId: string,
  params: { skip?: number; limit?: number } = {}
): Promise<ImportJob[]> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/api/v1/projects/${projectId}/imports${query ? `?${query}` : ""}`;

  return apiClient<ImportJob[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}
