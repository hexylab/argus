import { apiClient } from "./client";
import type { SearchRequest, SearchResponse } from "@/types/search";

export async function searchFrames(
  accessToken: string,
  projectId: string,
  request: SearchRequest
): Promise<SearchResponse> {
  return apiClient<SearchResponse>(`/api/v1/projects/${projectId}/search`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(request),
  });
}
