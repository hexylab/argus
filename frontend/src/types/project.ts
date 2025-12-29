export type ProjectStatus = "active" | "archived" | "deleted";

export interface ProjectSettings {
  default_fps?: number;
  auto_annotation?: boolean;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  settings: ProjectSettings;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreate {
  name: string;
  description?: string | null;
  settings?: Record<string, unknown> | null;
}

export interface ProjectUpdate {
  name?: string;
  description?: string | null;
  status?: ProjectStatus;
  settings?: Record<string, unknown> | null;
}

export interface ProjectListParams {
  skip?: number;
  limit?: number;
}
