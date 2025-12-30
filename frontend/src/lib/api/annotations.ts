import { apiClient } from "./client";
import type { Annotation, AnnotationBulkSaveItem } from "@/types/annotation";

export async function getAnnotations(
  accessToken: string,
  projectId: string,
  videoId: string,
  frameId: string
): Promise<Annotation[]> {
  const endpoint = `/api/v1/projects/${projectId}/videos/${videoId}/frames/${frameId}/annotations`;

  return apiClient<Annotation[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function bulkSaveAnnotations(
  accessToken: string,
  projectId: string,
  videoId: string,
  frameId: string,
  annotations: AnnotationBulkSaveItem[]
): Promise<Annotation[]> {
  const endpoint = `/api/v1/projects/${projectId}/videos/${videoId}/frames/${frameId}/annotations`;

  return apiClient<Annotation[]>(endpoint, {
    method: "PUT",
    accessToken,
    body: JSON.stringify({ annotations }),
  });
}
