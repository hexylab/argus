"use server";

import { createClient } from "@/lib/supabase/server";
import { getFrame } from "@/lib/api/frames";
import type { FrameDetail } from "@/types/frame";

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
