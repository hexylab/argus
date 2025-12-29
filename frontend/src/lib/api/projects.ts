import { apiClient } from "./client";
import type {
  Project,
  ProjectCreate,
  ProjectListParams,
} from "@/types/project";

export async function getProject(
  accessToken: string,
  projectId: string
): Promise<Project> {
  return apiClient<Project>(`/api/v1/projects/${projectId}`, {
    method: "GET",
    accessToken,
  });
}

export async function getProjects(
  accessToken: string,
  params: ProjectListParams = {}
): Promise<Project[]> {
  const searchParams = new URLSearchParams();
  if (params.skip !== undefined) searchParams.set("skip", String(params.skip));
  if (params.limit !== undefined)
    searchParams.set("limit", String(params.limit));

  const query = searchParams.toString();
  const endpoint = `/api/v1/projects${query ? `?${query}` : ""}`;

  return apiClient<Project[]>(endpoint, {
    method: "GET",
    accessToken,
  });
}

export async function createProject(
  accessToken: string,
  data: ProjectCreate
): Promise<Project> {
  return apiClient<Project>("/api/v1/projects", {
    method: "POST",
    accessToken,
    body: JSON.stringify(data),
  });
}
