"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getFrame, getFrames } from "@/lib/api/frames";
import { getLabels } from "@/lib/api/labels";
import { getAnnotations, bulkSaveAnnotations } from "@/lib/api/annotations";
import type { Frame, FrameDetail } from "@/types/frame";
import type { Label } from "@/types/label";
import type { Annotation, AnnotationBulkSaveItem } from "@/types/annotation";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function fetchFrame(
  projectId: string,
  videoId: string,
  frameId: string
): Promise<{
  frame?: FrameDetail;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const frame = await getFrame(accessToken, projectId, videoId, frameId);
    return { frame };
  } catch (error) {
    console.error("Failed to fetch frame:", error);
    return { error: "フレームの取得に失敗しました" };
  }
}

export async function fetchLabels(projectId: string): Promise<{
  labels?: Label[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      // Return empty labels instead of error to not break the page
      return { labels: [] };
    }

    const labels = await getLabels(accessToken, projectId);
    return { labels };
  } catch (error) {
    // Log error but return empty labels to not break the page
    console.error("Failed to fetch labels:", error);
    return { labels: [] };
  }
}

export async function fetchAllFrames(
  projectId: string,
  videoId: string
): Promise<{
  frames?: Frame[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    // Backend limit is 500 max, fetch in batches if needed
    const allFrames: Frame[] = [];
    let skip = 0;
    const limit = 500;

    while (true) {
      const batch = await getFrames(accessToken, projectId, videoId, {
        skip,
        limit,
      });
      allFrames.push(...batch);
      if (batch.length < limit) break;
      skip += limit;
    }

    return { frames: allFrames };
  } catch (error) {
    console.error("Failed to fetch frames:", error);
    return { error: "フレーム一覧の取得に失敗しました" };
  }
}

export async function fetchAnnotations(
  projectId: string,
  videoId: string,
  frameId: string
): Promise<{
  annotations?: Annotation[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const annotations = await getAnnotations(
      accessToken,
      projectId,
      videoId,
      frameId
    );
    return { annotations };
  } catch (error) {
    console.error("Failed to fetch annotations:", error);
    return { error: "アノテーションの取得に失敗しました" };
  }
}

export async function saveAnnotationsAction(
  projectId: string,
  videoId: string,
  frameId: string,
  annotations: AnnotationBulkSaveItem[]
): Promise<{
  annotations?: Annotation[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const saved = await bulkSaveAnnotations(
      accessToken,
      projectId,
      videoId,
      frameId,
      annotations
    );

    revalidatePath(
      `/projects/${projectId}/videos/${videoId}/frames/${frameId}`
    );

    return { annotations: saved };
  } catch (error) {
    console.error("Failed to save annotations:", error);
    return { error: "アノテーションの保存に失敗しました" };
  }
}

export async function fetchFrameWithAnnotations(
  projectId: string,
  videoId: string,
  frameId: string
): Promise<{
  frame?: FrameDetail;
  annotations?: Annotation[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const [frame, annotations] = await Promise.all([
      getFrame(accessToken, projectId, videoId, frameId),
      getAnnotations(accessToken, projectId, videoId, frameId),
    ]);

    return { frame, annotations };
  } catch (error) {
    console.error("Failed to fetch frame with annotations:", error);
    return { error: "フレームデータの取得に失敗しました" };
  }
}
