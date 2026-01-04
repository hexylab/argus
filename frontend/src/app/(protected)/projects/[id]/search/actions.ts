"use server";

import { createClient } from "@/lib/supabase/server";
import { searchFrames } from "@/lib/api/search";
import type { SearchRequest, SearchResponse } from "@/types/search";

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
