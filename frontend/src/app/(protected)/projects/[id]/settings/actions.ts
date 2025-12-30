"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getProject, updateProject, deleteProject } from "@/lib/api/projects";
import {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
} from "@/lib/api/labels";
import type { Project, ProjectUpdate } from "@/types/project";
import type { Label, LabelCreate, LabelUpdate } from "@/types/label";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

// Project Actions

export async function fetchProject(projectId: string): Promise<{
  project?: Project;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const project = await getProject(accessToken, projectId);
    return { project };
  } catch (error) {
    console.error("Failed to fetch project:", error);
    return { error: "プロジェクトの取得に失敗しました" };
  }
}

export async function updateProjectAction(
  projectId: string,
  data: ProjectUpdate
): Promise<{
  project?: Project;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const project = await updateProject(accessToken, projectId, data);
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/settings`);
    revalidatePath("/dashboard");
    return { project };
  } catch (error) {
    console.error("Failed to update project:", error);
    return { error: "プロジェクトの更新に失敗しました" };
  }
}

export async function deleteProjectAction(projectId: string): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    await deleteProject(accessToken, projectId);
    revalidatePath("/dashboard");
  } catch (error) {
    console.error("Failed to delete project:", error);
    return { error: "プロジェクトの削除に失敗しました" };
  }

  // Redirect after successful deletion
  redirect("/dashboard");
}

// Label Actions

export async function fetchLabels(projectId: string): Promise<{
  labels?: Label[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { labels: [] };
    }

    const labels = await getLabels(accessToken, projectId);
    return { labels };
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    return { labels: [] };
  }
}

export async function createLabelAction(
  projectId: string,
  data: LabelCreate
): Promise<{
  label?: Label;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const label = await createLabel(accessToken, projectId, data);
    revalidatePath(`/projects/${projectId}/settings`);
    return { label };
  } catch (error) {
    console.error("Failed to create label:", error);
    return { error: "ラベルの作成に失敗しました" };
  }
}

export async function updateLabelAction(
  projectId: string,
  labelId: string,
  data: LabelUpdate
): Promise<{
  label?: Label;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const label = await updateLabel(accessToken, projectId, labelId, data);
    revalidatePath(`/projects/${projectId}/settings`);
    return { label };
  } catch (error) {
    console.error("Failed to update label:", error);
    return { error: "ラベルの更新に失敗しました" };
  }
}

export async function deleteLabelAction(
  projectId: string,
  labelId: string
): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    await deleteLabel(accessToken, projectId, labelId);
    revalidatePath(`/projects/${projectId}/settings`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete label:", error);
    return { error: "ラベルの削除に失敗しました" };
  }
}
