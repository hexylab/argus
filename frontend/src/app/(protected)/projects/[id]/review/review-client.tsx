"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchAllAnnotations,
  fetchStats,
  approveAnnotations,
  deleteAnnotations,
} from "./actions";
import { SimpleReviewGrid } from "./components/simple-review-grid";
import { PreviewDialog } from "./components/preview-dialog";
import type {
  AnnotationWithFrame,
  AnnotationReviewStats,
} from "@/types/annotation-review";

interface ReviewClientProps {
  projectId: string;
  initialAnnotations: AnnotationWithFrame[];
  initialStats: AnnotationReviewStats;
}

// Sort options
type SortOption = "frame" | "label" | "score-high" | "score-low";

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

export function ReviewClient({
  projectId,
  initialAnnotations,
  initialStats,
}: ReviewClientProps) {
  const [annotations, setAnnotations] =
    useState<AnnotationWithFrame[]>(initialAnnotations);
  const [stats, setStats] = useState<AnnotationReviewStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Excluded items (to be deleted)
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  // Sorting
  const [sortOption, setSortOption] = useState<SortOption>("frame");

  // Preview dialog
  const [previewAnnotation, setPreviewAnnotation] =
    useState<AnnotationWithFrame | null>(null);

  // Computed values
  const excludedCount = excludedIds.size;
  const approveCount = annotations.length - excludedCount;

  // Sorted annotations
  const sortedAnnotations = useMemo(() => {
    const sorted = [...annotations];
    switch (sortOption) {
      case "label":
        sorted.sort((a, b) => a.label_name.localeCompare(b.label_name));
        break;
      case "score-high":
        sorted.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        break;
      case "score-low":
        sorted.sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0));
        break;
      case "frame":
      default:
        sorted.sort((a, b) => a.frame_number - b.frame_number);
        break;
    }
    return sorted;
  }, [annotations, sortOption]);

  // Toggle exclusion
  const toggleExcluded = useCallback((id: string) => {
    setExcludedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Clear exclusions
  const clearExcluded = useCallback(() => {
    setExcludedIds(new Set());
  }, []);

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setExcludedIds(new Set());

    const [annotationsResult, statsResult] = await Promise.all([
      fetchAllAnnotations(projectId, { reviewed: false }),
      fetchStats(projectId),
    ]);

    if (annotationsResult.error) {
      setError(annotationsResult.error);
    } else {
      setAnnotations(annotationsResult.annotations ?? []);
    }

    if (statsResult.stats) {
      setStats(statsResult.stats);
    }

    setIsLoading(false);
  }, [projectId]);

  // Approve all (without excluded)
  const handleApproveAll = useCallback(async () => {
    const idsToApprove = annotations
      .filter((a) => !excludedIds.has(a.id))
      .map((a) => a.id);

    if (idsToApprove.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const result = await approveAnnotations(projectId, idsToApprove);

    if (result.error) {
      setError(result.error);
    } else {
      // Remove approved items from list
      setAnnotations((prev) => prev.filter((a) => excludedIds.has(a.id)));
      setStats((prev) => ({
        ...prev,
        reviewed_count:
          prev.reviewed_count + (result.result?.approved_count ?? 0),
        pending_count:
          prev.pending_count - (result.result?.approved_count ?? 0),
      }));
      setExcludedIds(new Set());
    }

    setIsProcessing(false);
  }, [projectId, annotations, excludedIds]);

  // Delete excluded and approve rest
  const handleDeleteExcludedAndApprove = useCallback(async () => {
    if (excludedIds.size === 0) {
      // No exclusions, just approve all
      return handleApproveAll();
    }

    setIsProcessing(true);
    setError(null);

    // First delete excluded
    const deleteResult = await deleteAnnotations(
      projectId,
      Array.from(excludedIds)
    );

    if (deleteResult.error) {
      setError(deleteResult.error);
      setIsProcessing(false);
      return;
    }

    // Then approve the rest
    const idsToApprove = annotations
      .filter((a) => !excludedIds.has(a.id))
      .map((a) => a.id);

    if (idsToApprove.length > 0) {
      const approveResult = await approveAnnotations(projectId, idsToApprove);

      if (approveResult.error) {
        setError(approveResult.error);
        setIsProcessing(false);
        return;
      }

      setStats((prev) => ({
        ...prev,
        total_count:
          prev.total_count - (deleteResult.result?.deleted_count ?? 0),
        reviewed_count:
          prev.reviewed_count + (approveResult.result?.approved_count ?? 0),
        pending_count: 0,
      }));
    } else {
      setStats((prev) => ({
        ...prev,
        total_count:
          prev.total_count - (deleteResult.result?.deleted_count ?? 0),
        pending_count:
          prev.pending_count - (deleteResult.result?.deleted_count ?? 0),
      }));
    }

    // Clear the list
    setAnnotations([]);
    setExcludedIds(new Set());
    setIsProcessing(false);
  }, [projectId, annotations, excludedIds, handleApproveAll]);

  // All done state
  if (!isLoading && annotations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className={cn(
            "size-20 rounded-2xl flex items-center justify-center mb-6",
            "bg-gradient-to-br from-emerald-100 to-emerald-50",
            "dark:from-emerald-900/30 dark:to-emerald-950/20",
            "border border-emerald-200 dark:border-emerald-800"
          )}
        >
          <CheckIcon className="size-10 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="text-lg font-medium">レビュー完了</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-[280px]">
          未レビューのアノテーションはありません。
        </p>
        <div className="flex items-center gap-3 mt-6">
          <Button variant="outline" onClick={refreshData} className="gap-2">
            <RefreshIcon className="size-4" />
            更新
          </Button>
          <Link href={`/projects/${projectId}`}>
            <Button variant="outline">プロジェクトに戻る</Button>
          </Link>
        </div>
        {stats.reviewed_count > 0 ? (
          <p className="text-xs text-muted-foreground mt-4">
            承認済み: {stats.reviewed_count}件
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl",
          "bg-gradient-to-r from-muted/50 to-muted/30",
          "border border-border/50"
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            未レビュー: <span className="text-lg">{annotations.length}</span>件
          </span>
          {isLoading ? (
            <RefreshIcon className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <button
              type="button"
              onClick={refreshData}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="更新"
            >
              <RefreshIcon className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {excludedCount === 0 ? (
            <Button
              onClick={handleApproveAll}
              disabled={isProcessing || annotations.length === 0}
              className={cn(
                "gap-2",
                "bg-gradient-to-r from-emerald-600 to-emerald-700",
                "hover:from-emerald-500 hover:to-emerald-600"
              )}
            >
              <CheckIcon className="size-4" />
              すべて承認 ({annotations.length})
            </Button>
          ) : (
            <>
              <span className="text-sm text-muted-foreground">
                除外: {excludedCount}件
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearExcluded}
                disabled={isProcessing}
              >
                クリア
              </Button>
              <Button
                onClick={handleDeleteExcludedAndApprove}
                disabled={isProcessing}
                className={cn(
                  "gap-2",
                  "bg-gradient-to-r from-emerald-600 to-emerald-700",
                  "hover:from-emerald-500 hover:to-emerald-600"
                )}
              >
                <TrashIcon className="size-4" />
                {excludedCount}件削除 & {approveCount}件承認
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Sort and Help */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          問題のあるアノテーションをクリックして除外マークを付けてください。除外したものは削除され、残りは承認されます。
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">並び替え:</span>
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as SortOption)}
            className={cn(
              "text-xs px-2 py-1 rounded border border-border",
              "bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
            )}
          >
            <option value="frame">フレーム順</option>
            <option value="label">ラベル順</option>
            <option value="score-high">Score高い順</option>
            <option value="score-low">Score低い順</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error ? (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-3",
            "bg-red-50 dark:bg-red-950/30",
            "border border-red-200 dark:border-red-900/50",
            "text-sm text-red-700 dark:text-red-300"
          )}
        >
          <svg
            className="size-4 shrink-0"
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
          {error}
        </div>
      ) : null}

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="flex flex-col">
              <div className="aspect-video rounded-t-lg bg-muted animate-pulse" />
              <div className="h-8 rounded-b-lg bg-muted/50 animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <SimpleReviewGrid
          annotations={sortedAnnotations}
          excludedIds={excludedIds}
          onToggleExcluded={toggleExcluded}
          onOpenPreview={setPreviewAnnotation}
        />
      )}

      {/* Preview Dialog */}
      <PreviewDialog
        annotation={previewAnnotation}
        projectId={projectId}
        isExcluded={
          previewAnnotation ? excludedIds.has(previewAnnotation.id) : false
        }
        onClose={() => setPreviewAnnotation(null)}
        onToggleExcluded={() => {
          if (previewAnnotation) {
            toggleExcluded(previewAnnotation.id);
          }
        }}
      />
    </div>
  );
}
