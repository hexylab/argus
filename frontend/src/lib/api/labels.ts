import type { Label, LabelCreate, LabelUpdate } from "@/types/label";
import { apiClient } from "./client";

export async function getLabels(
  accessToken: string,
  projectId: string
): Promise<Label[]> {
  return apiClient<Label[]>(`/api/v1/projects/${projectId}/labels`, {
    accessToken,
  });
}

export async function getLabel(
  accessToken: string,
  projectId: string,
  labelId: string
): Promise<Label> {
  return apiClient<Label>(`/api/v1/projects/${projectId}/labels/${labelId}`, {
    accessToken,
  });
}

export async function createLabel(
  accessToken: string,
  projectId: string,
  data: LabelCreate
): Promise<Label> {
  return apiClient<Label>(`/api/v1/projects/${projectId}/labels`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });
}

export async function updateLabel(
  accessToken: string,
  projectId: string,
  labelId: string,
  data: LabelUpdate
): Promise<Label> {
  return apiClient<Label>(`/api/v1/projects/${projectId}/labels/${labelId}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(data),
  });
}

export async function deleteLabel(
  accessToken: string,
  projectId: string,
  labelId: string
): Promise<void> {
  return apiClient<void>(`/api/v1/projects/${projectId}/labels/${labelId}`, {
    method: "DELETE",
    accessToken,
  });
}
