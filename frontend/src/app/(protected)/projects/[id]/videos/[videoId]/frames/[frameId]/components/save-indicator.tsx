"use client";

import { cn } from "@/lib/utils";

export type SaveStatus = "saved" | "saving" | "unsaved" | "error";

interface SaveIndicatorProps {
  status: SaveStatus;
  onSave?: () => void;
}

export function SaveIndicator({ status, onSave }: SaveIndicatorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            "size-2 rounded-full",
            status === "saved" && "bg-green-500",
            status === "saving" && "bg-yellow-500 animate-pulse",
            status === "unsaved" && "bg-orange-500",
            status === "error" && "bg-red-500"
          )}
        />
        <span className="text-xs text-muted-foreground">
          {status === "saved" && "保存済み"}
          {status === "saving" && "保存中..."}
          {status === "unsaved" && "未保存"}
          {status === "error" && "保存エラー"}
        </span>
      </div>

      {status === "unsaved" && onSave ? (
        <button
          type="button"
          onClick={onSave}
          className="text-xs text-primary hover:underline"
        >
          保存 (Ctrl+S)
        </button>
      ) : null}
    </div>
  );
}
