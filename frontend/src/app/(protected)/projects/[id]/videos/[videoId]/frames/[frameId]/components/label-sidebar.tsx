"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
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
  const [searchQuery, setSearchQuery] = useState("");

  // Filter labels based on search
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter(
      (label) =>
        label.name.toLowerCase().includes(query) ||
        label.description?.toLowerCase().includes(query)
    );
  }, [labels, searchQuery]);

  // Get original index for keyboard hint
  const getOriginalIndex = (label: Label): number => {
    return labels.findIndex((l) => l.id === label.id);
  };

  const showSearch = labels.length > 12;

  if (labels.length === 0) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-muted">
          <svg
            className="size-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 6h.008v.008H6V6z"
            />
          </svg>
        </div>
        <p>ラベルがありません</p>
        <p className="mt-1 text-xs">
          プロジェクト設定からラベルを追加してください
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with count */}
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-medium text-muted-foreground">
          ラベル
        </span>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
          {filteredLabels.length === labels.length
            ? labels.length
            : `${filteredLabels.length}/${labels.length}`}
        </span>
      </div>

      {/* Search - shown when many labels */}
      {showSearch ? (
        <div className="p-2 border-b">
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <Input
              type="text"
              placeholder="検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-7 pl-8 text-xs"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Scrollable label list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="flex flex-col gap-0.5 p-1.5">
          {filteredLabels.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-xs text-muted-foreground">
                該当するラベルがありません
              </p>
            </div>
          ) : (
            filteredLabels.map((label) => {
              const isSelected = label.id === selectedLabelId;
              const count = annotationCounts[label.id] ?? 0;
              const originalIndex = getOriginalIndex(label);

              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => onLabelSelect(label.id)}
                  className={cn(
                    "flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-all duration-150",
                    "hover:bg-muted/70",
                    isSelected && "bg-muted ring-1 ring-primary shadow-sm"
                  )}
                >
                  <div
                    className="size-3 rounded-sm flex-shrink-0 ring-1 ring-black/10"
                    style={{ backgroundColor: label.color }}
                  />
                  <span className="text-sm flex-1 truncate">{label.name}</span>

                  {/* Keyboard shortcut - only show for first 9 in original list */}
                  {originalIndex < 9 && (
                    <span className="text-[10px] text-muted-foreground tabular-nums w-3 text-center">
                      {originalIndex + 1}
                    </span>
                  )}

                  {/* Annotation count badge */}
                  {count > 0 && (
                    <span
                      className={cn(
                        "text-xs px-1.5 py-0.5 rounded tabular-nums",
                        isSelected
                          ? "bg-primary/20 text-primary"
                          : "bg-muted-foreground/20 text-muted-foreground"
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-[10px] text-muted-foreground px-3 py-2 border-t bg-muted/30">
        <kbd className="px-1 py-0.5 bg-background rounded border text-[9px]">
          1
        </kbd>
        -
        <kbd className="px-1 py-0.5 bg-background rounded border text-[9px]">
          9
        </kbd>{" "}
        キーで選択
      </div>
    </div>
  );
}
