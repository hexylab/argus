"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Label } from "@/types/label";

interface LabelSelectDialogProps {
  open: boolean;
  labels: Label[];
  onSelect: (labelId: string) => void;
  onCancel: () => void;
}

export function LabelSelectDialog({
  open,
  labels,
  onSelect,
  onCancel,
}: LabelSelectDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter labels based on search query
  const filteredLabels = useMemo(() => {
    if (!searchQuery.trim()) return labels;
    const query = searchQuery.toLowerCase();
    return labels.filter(
      (label) =>
        label.name.toLowerCase().includes(query) ||
        label.description?.toLowerCase().includes(query)
    );
  }, [labels, searchQuery]);

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      // Focus search input when dialog opens (with many labels)
      if (labels.length > 9) {
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
    }
  }, [open, labels.length]);

  // Keyboard shortcuts for selecting labels (1-9)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;

      // Number keys 1-9 select labels
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const index = num - 1;
        if (index < filteredLabels.length) {
          e.preventDefault();
          onSelect(filteredLabels[index].id);
        }
      }

      // Escape to cancel
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [open, filteredLabels, onSelect, onCancel]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const showSearch = labels.length > 9;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <DialogTitle>ラベルを選択</DialogTitle>
            {labels.length > 0 && (
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                {filteredLabels.length === labels.length
                  ? `${labels.length} 件`
                  : `${filteredLabels.length} / ${labels.length} 件`}
              </span>
            )}
          </div>
          <DialogDescription>
            描画したバウンディングボックスに割り当てるラベルを選択してください
          </DialogDescription>
        </DialogHeader>

        {labels.length === 0 ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
              <svg
                className="size-6 text-muted-foreground"
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
            <p className="text-muted-foreground">ラベルが登録されていません</p>
            <p className="text-sm text-muted-foreground mt-1">
              プロジェクト設定からラベルを追加してください
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Search input - shown when many labels */}
            {showSearch ? (
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
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
                  ref={searchInputRef}
                  type="text"
                  placeholder="ラベルを検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20"
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground transition-colors"
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
            ) : null}

            {/* Labels list with scroll */}
            <div
              ref={listRef}
              className={cn(
                "rounded-lg border divide-y overflow-y-auto",
                "scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent",
                showSearch ? "max-h-[50vh]" : "max-h-[60vh]"
              )}
            >
              {filteredLabels.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    「{searchQuery}」に一致するラベルがありません
                  </p>
                </div>
              ) : (
                filteredLabels.map((label, index) => (
                  <button
                    key={label.id}
                    type="button"
                    onClick={() => onSelect(label.id)}
                    className={cn(
                      "flex items-center gap-3 w-full px-3 py-2.5 text-left",
                      "hover:bg-muted/50 focus:bg-muted/50 focus:outline-none",
                      "transition-all duration-150"
                    )}
                  >
                    {/* Color indicator */}
                    <div
                      className="size-3.5 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: label.color }}
                    />

                    {/* Label info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {label.name}
                      </p>
                      {label.description ? (
                        <p className="text-xs text-muted-foreground truncate">
                          {label.description}
                        </p>
                      ) : null}
                    </div>

                    {/* Keyboard shortcut hint */}
                    {index < 9 && (
                      <kbd className="hidden sm:inline-flex items-center justify-center size-5 text-[10px] font-medium text-muted-foreground bg-muted rounded border border-border/50">
                        {index + 1}
                      </kbd>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Keyboard hint */}
            {filteredLabels.length > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded border border-border/50">
                  1
                </kbd>
                {" - "}
                <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded border border-border/50">
                  9
                </kbd>
                {" キーでクイック選択"}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
