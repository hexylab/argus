"use server";

import { createClient } from "@/lib/supabase/server";
import {
  exportCOCO,
  exportYOLO,
  type COCOExport,
  type YOLOExport,
} from "@/lib/api/export";

async function getAccessToken(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export async function exportCOCOAction(projectId: string): Promise<{
  data?: COCOExport;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await exportCOCO(accessToken, projectId);
    return { data };
  } catch (error) {
    console.error("COCO export failed:", error);
    return { error: "COCOエクスポートに失敗しました" };
  }
}

export async function exportYOLOAction(projectId: string): Promise<{
  data?: YOLOExport;
  error?: string;
}> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      return { error: "認証が必要です" };
    }

    const data = await exportYOLO(accessToken, projectId);
    return { data };
  } catch (error) {
    console.error("YOLO export failed:", error);
    return { error: "YOLOエクスポートに失敗しました" };
  }
}
