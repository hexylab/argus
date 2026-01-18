"use server";

import { createClient } from "@/lib/supabase/server";
import { searchFrames } from "@/lib/api/search";
import { startAutoAnnotation, getTaskStatus } from "@/lib/api/auto-annotation";
import { getLabels } from "@/lib/api/labels";
import type { SearchRequest, SearchResponse } from "@/types/search";
import type {
  AutoAnnotateRequest,
  AutoAnnotateResponse,
  TaskStatusResponse,
} from "@/types/auto-annotation";
import type { Label } from "@/types/label";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function performSearch(
  projectId: string,
  request: SearchRequest
): Promise<{
  data?: SearchResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await searchFrames(accessToken, projectId, request);
    return { data };
  } catch (error) {
    console.error("Failed to search:", error);
    return { error: "検索に失敗しました" };
  }
}

/**
 * Search all frames with automatic pagination.
 * Loads all matching results by making multiple requests if needed.
 */
export async function searchAllFrames(
  projectId: string,
  query: string,
  params: Omit<SearchRequest, "query" | "limit" | "offset"> = {}
): Promise<{
  data?: SearchResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const allResults: SearchResponse["results"] = [];
    const batchSize = 500; // API maximum
    let offset = 0;
    let hasMore = true;
    let total = 0;

    while (hasMore) {
      const response = await searchFrames(accessToken, projectId, {
        query,
        ...params,
        limit: batchSize,
        offset,
      });

      allResults.push(...response.results);
      total = response.total;
      hasMore = response.has_more;
      offset += batchSize;
    }

    return {
      data: {
        results: allResults,
        total,
        has_more: false,
      },
    };
  } catch (error) {
    console.error("Failed to search all frames:", error);
    return { error: "検索に失敗しました" };
  }
}

export async function fetchLabels(projectId: string): Promise<{
  data?: Label[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await getLabels(accessToken, projectId);
    return { data };
  } catch (error) {
    console.error("Failed to fetch labels:", error);
    return { error: "ラベルの取得に失敗しました" };
  }
}

export async function performAutoAnnotation(
  projectId: string,
  request: AutoAnnotateRequest
): Promise<{
  data?: AutoAnnotateResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await startAutoAnnotation(accessToken, projectId, request);
    return { data };
  } catch (error) {
    console.error("Failed to start auto-annotation:", error);
    return { error: "自動アノテーションの開始に失敗しました" };
  }
}

export async function fetchTaskStatus(
  projectId: string,
  taskId: string
): Promise<{
  data?: TaskStatusResponse;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await getTaskStatus(accessToken, projectId, taskId);
    return { data };
  } catch (error) {
    console.error("Failed to fetch task status:", error);
    return { error: "タスクステータスの取得に失敗しました" };
  }
}
