"use server";

import { createClient } from "@/lib/supabase/server";
import { getVideo } from "@/lib/api/videos";
import { getFrames } from "@/lib/api/frames";
import type { Video } from "@/types/video";
import type { Frame } from "@/types/frame";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function fetchVideo(
  projectId: string,
  videoId: string
): Promise<{
  video?: Video;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const video = await getVideo(accessToken, projectId, videoId);
    return { video };
  } catch (error) {
    console.error("Failed to fetch video:", error);
    return { error: "映像の取得に失敗しました" };
  }
}

export async function fetchFrames(
  projectId: string,
  videoId: string,
  limit: number = 100
): Promise<{
  frames?: Frame[];
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const frames = await getFrames(accessToken, projectId, videoId, { limit });
    return { frames };
  } catch (error) {
    console.error("Failed to fetch frames:", error);
    return { error: "フレームの取得に失敗しました" };
  }
}
