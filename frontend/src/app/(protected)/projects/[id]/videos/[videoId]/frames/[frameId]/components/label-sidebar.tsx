"use client";

import { cn } from "@/lib/utils";
import type { Label } from "@/types/label";

interface LabelSidebarProps {
  labels: Label[];
  selectedLabelId: string | null;
  onLabelSelect: (labelId: string) => void;
  annotationCounts?: Record<string, number>;
}

export function LabelSidebar({
  labels,
  selectedLabelId,
  onLabelSelect,
  annotationCounts = {},
}: LabelSidebarProps) {
  if (labels.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <p>ラベルがありません</p>
        <p className="mt-1 text-xs">
          プロジェクト設定からラベルを追加してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-2">
      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
        ラベル
      </div>
      {labels.map((label, index) => {
        const isSelected = label.id === selectedLabelId;
        const count = annotationCounts[label.id] ?? 0;

        return (
          <button
            key={label.id}
            type="button"
            onClick={() => onLabelSelect(label.id)}
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors",
              "hover:bg-muted",
              isSelected && "bg-muted ring-1 ring-primary"
            )}
          >
            <div
              className="size-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: label.color }}
            />
            <span className="text-sm flex-1 truncate">{label.name}</span>
            <span className="text-xs text-muted-foreground">{index + 1}</span>
            {count > 0 ? (
              <span className="text-xs bg-muted-foreground/20 px-1.5 py-0.5 rounded">
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
      <div className="text-xs text-muted-foreground px-2 py-2 mt-2 border-t">
        ヒント: 数字キーでラベルを選択
      </div>
    </div>
  );
}
