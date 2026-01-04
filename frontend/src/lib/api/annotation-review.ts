import { apiClient } from "./client";
import type {
  AnnotationWithFrame,
  AnnotationReviewStats,
  AnnotationFilterParams,
  BulkApproveResponse,
  BulkDeleteResponse,
} from "@/types/annotation-review";

export async function getProjectAnnotations(
  accessToken: string,
  projectId: string,
  params: AnnotationFilterParams = {}
): Promise<AnnotationWithFrame[]> {
  const searchParams = new URLSearchParams();

  if (params.source) searchParams.set("source", params.source);
  if (params.reviewed !== undefined)
    searchParams.set("reviewed", String(params.reviewed));
  if (params.min_confidence !== undefined)
    searchParams.set("min_confidence", String(params.min_confidence));
  if (params.max_confidence !== undefined)
    searchParams.set("max_confidence", String(params.max_confidence));
  if (params.label_id) searchParams.set("label_id", params.label_id);
  if (params.video_id) searchParams.set("video_id", params.video_id);
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));

  const queryString = searchParams.toString();
  const endpoint = `/api/v1/projects/${projectId}/annotations${queryString ? `?${queryString}` : ""}`;

  return apiClient<AnnotationWithFrame[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function getAnnotationStats(
  accessToken: string,
  projectId: string
): Promise<AnnotationReviewStats> {
  const endpoint = `/api/v1/projects/${projectId}/annotations/stats`;

  return apiClient<AnnotationReviewStats>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function bulkApproveAnnotations(
  accessToken: string,
  projectId: string,
  annotationIds: string[]
): Promise<BulkApproveResponse> {
  const endpoint = `/api/v1/projects/${projectId}/annotations/bulk-approve`;

  return apiClient<BulkApproveResponse>(endpoint, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ annotation_ids: annotationIds }),
  });
}

export async function bulkDeleteAnnotations(
  accessToken: string,
  projectId: string,
  annotationIds: string[]
): Promise<BulkDeleteResponse> {
  const endpoint = `/api/v1/projects/${projectId}/annotations/bulk-delete`;

  return apiClient<BulkDeleteResponse>(endpoint, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ annotation_ids: annotationIds }),
  });
}
