"use server";

import { createClient } from "@/lib/supabase/server";
import {
  getProjectAnnotations,
  getAnnotationStats,
  bulkApproveAnnotations,
  bulkDeleteAnnotations,
  updateAnnotation as apiUpdateAnnotation,
} from "@/lib/api/annotation-review";
import { getLabels } from "@/lib/api/labels";
import { getProject } from "@/lib/api/projects";
import type {
  AnnotationWithFrame,
  AnnotationReviewStats,
  AnnotationFilterParams,
  AnnotationUpdateRequest,
  BulkApproveResponse,
  BulkDeleteResponse,
} from "@/types/annotation-review";
import type { Annotation } from "@/types/annotation";
import type { Label } from "@/types/label";
import type { Project } from "@/types/project";

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
  } catch {
    return { error: "プロジェクトの取得に失敗しました" };
  }
}

export async function fetchLabels(projectId: string): Promise<{
  labels?: Label[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const labels = await getLabels(accessToken, projectId);
    return { labels };
  } catch {
    return { error: "ラベルの取得に失敗しました" };
  }
}

export async function fetchAnnotations(
  projectId: string,
  params: AnnotationFilterParams = {}
): Promise<{
  annotations?: AnnotationWithFrame[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const annotations = await getProjectAnnotations(
      accessToken,
      projectId,
      params
    );
    return { annotations };
  } catch {
    return { error: "アノテーションの取得に失敗しました" };
  }
}

/**
 * Fetch all annotations with automatic pagination.
 * Loads all data by making multiple requests if needed.
 */
export async function fetchAllAnnotations(
  projectId: string,
  params: Omit<AnnotationFilterParams, "skip" | "limit"> = {}
): Promise<{
  annotations?: AnnotationWithFrame[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const allAnnotations: AnnotationWithFrame[] = [];
    const batchSize = 500; // API maximum
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const batch = await getProjectAnnotations(accessToken, projectId, {
        ...params,
        skip,
        limit: batchSize,
      });

      allAnnotations.push(...batch);

      if (batch.length < batchSize) {
        hasMore = false;
      } else {
        skip += batchSize;
      }
    }

    return { annotations: allAnnotations };
  } catch {
    return { error: "アノテーションの取得に失敗しました" };
  }
}

export async function fetchStats(projectId: string): Promise<{
  stats?: AnnotationReviewStats;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const stats = await getAnnotationStats(accessToken, projectId);
    return { stats };
  } catch {
    return { error: "統計の取得に失敗しました" };
  }
}

export async function approveAnnotations(
  projectId: string,
  annotationIds: string[]
): Promise<{
  result?: BulkApproveResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const result = await bulkApproveAnnotations(
      accessToken,
      projectId,
      annotationIds
    );
    return { result };
  } catch (e) {
    console.error("approveAnnotations error:", e);
    return { error: `承認に失敗しました: ${e instanceof Error ? e.message : String(e)}` };
  }
}

export async function deleteAnnotations(
  projectId: string,
  annotationIds: string[]
): Promise<{
  result?: BulkDeleteResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const result = await bulkDeleteAnnotations(
      accessToken,
      projectId,
      annotationIds
    );
    return { result };
  } catch {
    return { error: "削除に失敗しました" };
  }
}

export async function updateAnnotation(
  projectId: string,
  videoId: string,
  frameId: string,
  annotationId: string,
  data: AnnotationUpdateRequest
): Promise<{
  annotation?: Annotation;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const annotation = await apiUpdateAnnotation(
      accessToken,
      projectId,
      videoId,
      frameId,
      annotationId,
      data
    );
    return { annotation };
  } catch {
    return { error: "アノテーションの更新に失敗しました" };
  }
}
