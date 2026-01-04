import type {
  AutoAnnotateRequest,
  AutoAnnotateResponse,
  TaskStatusResponse,
} from "@/types/auto-annotation";
import { apiClient } from "./client";

export async function startAutoAnnotation(
  accessToken: string,
  projectId: string,
  request: AutoAnnotateRequest
): Promise<AutoAnnotateResponse> {
  return apiClient<AutoAnnotateResponse>(
    `/api/v1/projects/${projectId}/auto-annotate`,
    {
      method: "POST",
      accessToken,
      body: JSON.stringify(request),
    }
  );
}

export async function getTaskStatus(
  accessToken: string,
  projectId: string,
  taskId: string
): Promise<TaskStatusResponse> {
  return apiClient<TaskStatusResponse>(
    `/api/v1/projects/${projectId}/auto-annotate/${taskId}`,
    {
      accessToken,
    }
  );
}
