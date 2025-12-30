import type { Label } from "@/types/label";
import { apiClient } from "./client";

export async function getLabels(
  accessToken: string,
  projectId: string
): Promise<Label[]> {
  return apiClient<Label[]>(`/projects/${projectId}/labels`, {
    accessToken,
  });
}

export async function getLabel(
  accessToken: string,
  projectId: string,
  labelId: string
): Promise<Label> {
  return apiClient<Label>(`/projects/${projectId}/labels/${labelId}`, {
    accessToken,
  });
}
