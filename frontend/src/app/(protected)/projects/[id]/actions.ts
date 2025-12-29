"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getProject } from "@/lib/api/projects";
import {
  getVideos,
  getUploadUrl,
  completeUpload,
  deleteVideo,
} from "@/lib/api/videos";
import type { Project } from "@/types/project";
import type { Video, UploadUrlResponse } from "@/types/video";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

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

export async function fetchVideos(projectId: string): Promise<{
  videos?: Video[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const videos = await getVideos(accessToken, projectId);
    return { videos };
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return { error: "映像の取得に失敗しました" };
  }
}

export async function requestUploadUrl(
  projectId: string,
  filename: string,
  mimeType?: string
): Promise<{
  data?: UploadUrlResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await getUploadUrl(accessToken, projectId, {
      filename,
      mime_type: mimeType,
    });
    return { data };
  } catch (error) {
    console.error("Failed to get upload URL:", error);
    return { error: "アップロードURLの取得に失敗しました" };
  }
}

export async function markUploadComplete(
  projectId: string,
  videoId: string,
  fileSize?: number
): Promise<{
  video?: Video;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const video = await completeUpload(accessToken, projectId, videoId, {
      file_size: fileSize,
    });

    revalidatePath(`/projects/${projectId}`);
    return { video };
  } catch (error) {
    console.error("Failed to complete upload:", error);
    return { error: "アップロード完了の通知に失敗しました" };
  }
}

export async function removeVideo(
  projectId: string,
  videoId: string
): Promise<{
  success?: boolean;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    await deleteVideo(accessToken, projectId, videoId);
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to delete video:", error);
    return { error: "映像の削除に失敗しました" };
  }
}
