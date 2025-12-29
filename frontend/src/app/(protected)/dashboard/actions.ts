"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getProjects, createProject } from "@/lib/api/projects";
import type { Project, ProjectCreate } from "@/types/project";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function fetchProjects(): Promise<{
  projects?: Project[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const projects = await getProjects(accessToken);
    return { projects };
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return { error: "プロジェクトの取得に失敗しました" };
  }
}

export async function createProjectAction(formData: FormData): Promise<{
  project?: Project;
  error?: string;
}> {
  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;

  if (!name || name.trim().length === 0) {
    return { error: "プロジェクト名は必須です" };
  }

  if (name.length > 255) {
    return { error: "プロジェクト名は255文字以内にしてください" };
  }

  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data: ProjectCreate = {
      name: name.trim(),
      description: description?.trim() || null,
    };

    const project = await createProject(accessToken, data);
    revalidatePath("/dashboard");
    return { project };
  } catch (error) {
    console.error("Failed to create project:", error);
    return { error: "プロジェクトの作成に失敗しました" };
  }
}
