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
import {
  getImportUploadUrl,
  previewImport as apiPreviewImport,
  startImport as apiStartImport,
  getImportStatus as apiGetImportStatus,
} from "@/lib/api/imports";
import type { Project } from "@/types/project";
import type { Video, UploadUrlResponse } from "@/types/video";
import type {
  ImportFormat,
  ImportUploadUrlResponse,
  ImportPreviewResponse,
  ImportJob,
  StartImportRequest,
} from "@/types/import";

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

// Import actions
export async function requestImportUploadUrl(
  projectId: string,
  filename: string,
  format: ImportFormat
): Promise<{
  data?: ImportUploadUrlResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await getImportUploadUrl(accessToken, projectId, {
      filename,
      format,
    });
    return { data };
  } catch (error) {
    console.error("Failed to get import upload URL:", error);
    return { error: "アップロードURLの取得に失敗しました" };
  }
}

export async function previewImport(
  projectId: string,
  importJobId: string
): Promise<{
  data?: ImportPreviewResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await apiPreviewImport(accessToken, projectId, importJobId);
    return { data };
  } catch (error) {
    console.error("Failed to preview import:", error);
    return { error: "プレビューの取得に失敗しました" };
  }
}

export async function startImport(
  projectId: string,
  importJobId: string,
  request: StartImportRequest
): Promise<{
  data?: ImportJob;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await apiStartImport(
      accessToken,
      projectId,
      importJobId,
      request
    );

    revalidatePath(`/projects/${projectId}`);
    return { data };
  } catch (error) {
    console.error("Failed to start import:", error);
    return { error: "インポートの開始に失敗しました" };
  }
}

export async function getImportStatus(
  projectId: string,
  importJobId: string
): Promise<{
  data?: ImportJob;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await apiGetImportStatus(accessToken, projectId, importJobId);
    return { data };
  } catch (error) {
    console.error("Failed to get import status:", error);
    return { error: "ステータスの取得に失敗しました" };
  }
}
