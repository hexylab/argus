"use server";

import { createClient } from "@/lib/supabase/server";
import { getFrame } from "@/lib/api/frames";
import { getLabels } from "@/lib/api/labels";
import type { FrameDetail } from "@/types/frame";
import type { Label } from "@/types/label";

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
