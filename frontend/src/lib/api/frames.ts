import { apiClient } from "./client";
import type { Frame, FrameListParams } from "@/types/frame";

export async function getFrames(
  accessToken: string,
  projectId: string,
  videoId: string,
  params: FrameListParams = {}
): Promise<Frame[]> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/api/v1/projects/${projectId}/videos/${videoId}/frames${query ? `?${query}` : ""}`;

  return apiClient<Frame[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}
