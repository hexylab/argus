"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Label as LabelType } from "@/types/label";
import type { TaskStatusResponse } from "@/types/auto-annotation";
import {
  fetchLabels,
  performAutoAnnotation,
  fetchTaskStatus,
} from "../actions";

type DialogState = "config" | "processing" | "success" | "error";

interface AutoAnnotateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  selectedFrameIds: string[];
  onComplete?: () => void;
}

// Sparkle icon for AI actions
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

// Animated processing indicator
function ProcessingIndicator() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulsing ring */}
      <div className="absolute size-20 rounded-full border border-primary/20 animate-ping" />
      <div
        className="absolute size-16 rounded-full border border-primary/30 animate-ping"
        style={{ animationDelay: "150ms" }}
      />
      <div
        className="absolute size-12 rounded-full border border-primary/40 animate-ping"
        style={{ animationDelay: "300ms" }}
      />

      {/* Center icon with gradient background */}
      <div
        className={cn(
          "relative size-14 rounded-full flex items-center justify-center",
          "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent",
          "border border-primary/20"
        )}
      >
        <SparkleIcon className="size-6 text-primary animate-pulse" />
      </div>
    </div>
  );
}

// Custom progress bar with gradient
function GradientProgress({ indeterminate }: { indeterminate?: boolean }) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
      <div
        className={cn(
          "h-full rounded-full",
          "bg-gradient-to-r from-primary/60 via-primary to-primary/60",
          indeterminate && "animate-progress-indeterminate"
        )}
        style={
          indeterminate
            ? { width: "40%" }
            : { width: "100%", transition: "width 0.3s ease" }
        }
      />
    </div>
  );
}

// Confidence slider with visual feedback
function ConfidenceSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const percentage = Math.round(value * 100);

  // Color based on confidence level
  const getColorClass = () => {
    if (percentage >= 70) return "text-green-600 dark:text-green-400";
    if (percentage >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">信頼度閾値</Label>
        <div
          className={cn(
            "flex items-center gap-1.5 tabular-nums text-sm font-semibold transition-colors",
            getColorClass()
          )}
        >
          <span className="text-lg">{percentage}</span>
          <span className="text-xs opacity-70">%</span>
        </div>
      </div>

      {/* Custom slider track */}
      <div className="relative">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-red-500/20 via-amber-500/20 to-green-500/20">
          {/* Filled portion */}
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
            style={{ width: `${percentage}%` }}
          />
          {/* Thumb track overlay for better visibility */}
          <input
            type="range"
            min="0"
            max="100"
            value={percentage}
            onChange={(e) => onChange(parseInt(e.target.value) / 100)}
            className={cn(
              "absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4",
              "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white",
              "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary",
              "[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab",
              "[&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110",
              "[&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:size-4",
              "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white",
              "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-primary",
              "[&::-moz-range-thumb]:shadow-md [&::-moz-range-thumb]:cursor-grab"
            )}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        この閾値以上の信頼度を持つ検出結果のみをアノテーションとして保存します
      </p>
    </div>
  );
}

// Label selector with color chips, search, and scrolling
function LabelSelector({
  labels,
  selectedId,
  onChange,
  isLoading,
}: {
  labels: LabelType[];
  selectedId: string;
  onChange: (id: string) => void;
  isLoading: boolean;
}) {
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

  const showSearch = labels.length > 8;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">検出対象ラベル</Label>
        <div className="h-11 rounded-lg border bg-muted/50 animate-pulse" />
      </div>
    );
  }

  if (labels.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="text-sm font-medium">検出対象ラベル</Label>
        <div className="rounded-lg border border-dashed border-muted-foreground/30 p-4 text-center">
          <p className="text-sm text-muted-foreground">
            ラベルがありません。先にラベルを作成してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">検出対象ラベル</Label>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded tabular-nums">
          {filteredLabels.length === labels.length
            ? `${labels.length} 件`
            : `${filteredLabels.length} / ${labels.length} 件`}
        </span>
      </div>

      {/* Search input - shown when many labels */}
      {showSearch ? (
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
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
            placeholder="ラベルを検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground hover:text-foreground transition-colors"
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

      {/* Scrollable label list */}
      <div
        className={cn(
          "rounded-lg border divide-y overflow-y-auto",
          showSearch ? "max-h-48" : "max-h-64"
        )}
      >
        {filteredLabels.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              「{searchQuery}」に一致するラベルがありません
            </p>
          </div>
        ) : (
          filteredLabels.map((label) => {
            const isSelected = label.id === selectedId;
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => onChange(label.id)}
                className={cn(
                  "flex items-center gap-3 w-full px-3 py-2.5 text-left",
                  "transition-all duration-150",
                  isSelected ? "bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                {/* Color chip */}
                <div
                  className="size-3.5 rounded-full ring-1 ring-inset ring-black/10 shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <span
                  className={cn(
                    "text-sm font-medium flex-1 truncate",
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {label.name}
                </span>
                {isSelected ? (
                  <svg
                    className="size-4 text-primary shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

// Result stats display
function ResultStats({
  result,
}: {
  result: NonNullable<TaskStatusResponse["result"]>;
}) {
  const stats = [
    {
      label: "処理フレーム",
      value: result.frame_count,
      color: "text-foreground",
    },
    {
      label: "作成アノテーション",
      value: result.annotation_count,
      color: "text-green-600 dark:text-green-400",
    },
  ];

  if (result.failed_count > 0) {
    stats.push({
      label: "失敗",
      value: result.failed_count,
      color: "text-red-600 dark:text-red-400",
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            "rounded-lg border bg-muted/30 p-3 text-center",
            "animate-in fade-in slide-in-from-bottom-1 duration-300"
          )}
        >
          <div className={cn("text-2xl font-bold tabular-nums", stat.color)}>
            {stat.value}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export function AutoAnnotateDialog({
  open,
  onOpenChange,
  projectId,
  selectedFrameIds,
  onComplete,
}: AutoAnnotateDialogProps) {
  const [state, setState] = useState<DialogState>("config");
  const [labels, setLabels] = useState<LabelType[]>([]);
  const [selectedLabelId, setSelectedLabelId] = useState<string>("");
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch labels when dialog opens
  useEffect(() => {
    if (open && labels.length === 0) {
      setIsLoadingLabels(true);
      fetchLabels(projectId)
        .then((result) => {
          if (result.data) {
            setLabels(result.data);
            if (result.data.length > 0) {
              setSelectedLabelId(result.data[0].id);
            }
          } else {
            setError(result.error ?? "ラベルの取得に失敗しました");
          }
        })
        .finally(() => setIsLoadingLabels(false));
    }
  }, [open, projectId, labels.length]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setState("config");
      setTaskId(null);
      setTaskStatus(null);
      setError(null);
    }
  }, [open]);

  // Poll task status
  useEffect(() => {
    if (!taskId || state !== "processing") {
      return;
    }

    const pollInterval = setInterval(async () => {
      const result = await fetchTaskStatus(projectId, taskId);

      if (result.error) {
        setState("error");
        setError(result.error);
        return;
      }

      if (result.data) {
        setTaskStatus(result.data);

        if (result.data.status === "SUCCESS") {
          setState("success");
        } else if (result.data.status === "FAILURE") {
          setState("error");
          setError(result.data.error ?? "自動アノテーションに失敗しました");
        }
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [taskId, projectId, state]);

  const handleStart = useCallback(async () => {
    if (!selectedLabelId) {
      return;
    }

    setState("processing");
    setError(null);

    const result = await performAutoAnnotation(projectId, {
      frame_ids: selectedFrameIds,
      label_id: selectedLabelId,
      options: {
        min_confidence: minConfidence,
      },
    });

    if (result.error) {
      setState("error");
      setError(result.error);
      return;
    }

    if (result.data) {
      setTaskId(result.data.task_id);
      setTaskStatus({
        task_id: result.data.task_id,
        status: "PENDING",
      });
    }
  }, [projectId, selectedFrameIds, selectedLabelId, minConfidence]);

  const handleClose = useCallback(() => {
    if (state === "success") {
      onComplete?.();
    }
    onOpenChange(false);
  }, [state, onComplete, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={state !== "processing"}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparkleIcon className="size-5 text-primary" />
            自動アノテーション
          </DialogTitle>
          <DialogDescription>
            {selectedFrameIds.length} 件のフレームをAIで自動処理します
          </DialogDescription>
        </DialogHeader>

        {/* Config State */}
        {state === "config" && (
          <div className="space-y-6 py-2">
            <LabelSelector
              labels={labels}
              selectedId={selectedLabelId}
              onChange={setSelectedLabelId}
              isLoading={isLoadingLabels}
            />
            <ConfidenceSlider
              value={minConfidence}
              onChange={setMinConfidence}
            />
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="py-8 space-y-6">
            <ProcessingIndicator />
            <div className="text-center space-y-2">
              <p className="text-sm font-medium">
                {taskStatus?.status === "PENDING"
                  ? "タスクを準備中..."
                  : taskStatus?.status === "STARTED"
                    ? "フレームを解析中..."
                    : "処理中..."}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedFrameIds.length} 件のフレームを処理しています
              </p>
            </div>
            <GradientProgress indeterminate />
          </div>
        )}

        {/* Success State */}
        {state === "success" && (
          <div className="py-6 space-y-6">
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "size-14 rounded-full flex items-center justify-center",
                  "bg-green-100 dark:bg-green-900/30",
                  "animate-in zoom-in-50 duration-300"
                )}
              >
                <svg
                  className="size-7 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                処理が完了しました
              </p>
            </div>

            {taskStatus?.result ? (
              <ResultStats result={taskStatus.result} />
            ) : null}
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="py-8 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <div
                className={cn(
                  "size-14 rounded-full flex items-center justify-center",
                  "bg-red-100 dark:bg-red-900/30"
                )}
              >
                <svg
                  className="size-7 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  エラーが発生しました
                </p>
                {error ? (
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    {error}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          {state === "config" && (
            <>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-none"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleStart}
                disabled={!selectedLabelId || labels.length === 0}
                className={cn(
                  "flex-1 sm:flex-none gap-2",
                  "bg-gradient-to-r from-primary to-primary/90",
                  "hover:from-primary/90 hover:to-primary/80"
                )}
              >
                <SparkleIcon className="size-4" />
                実行
              </Button>
            </>
          )}

          {(state === "success" || state === "error") && (
            <Button onClick={handleClose} className="w-full sm:w-auto">
              閉じる
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Custom animation keyframes */}
      <style jsx global>{`
        @keyframes progress-indeterminate {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 1.5s ease-in-out infinite;
        }
      `}</style>
    </Dialog>
  );
}
