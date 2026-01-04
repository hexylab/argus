"use client";

import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  fetchAnnotations,
  fetchStats,
  approveAnnotations,
  deleteAnnotations,
} from "./actions";
import { ReviewStats } from "./components/review-stats";
import { ReviewFilters } from "./components/review-filters";
import { ReviewGrid, ReviewGridSkeleton } from "./components/review-grid";
import { QuickReviewModal } from "./components/quick-review-modal";
import type {
  AnnotationWithFrame,
  AnnotationReviewStats,
} from "@/types/annotation-review";
import type { Label } from "@/types/label";

interface ReviewClientProps {
  projectId: string;
  labels: Label[];
  initialAnnotations: AnnotationWithFrame[];
  initialStats: AnnotationReviewStats;
}

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

function PlayIcon({ className }: { className?: string }) {
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
        d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z"
      />
    </svg>
  );
}

export function ReviewClient({
  projectId,
  labels,
  initialAnnotations,
  initialStats,
}: ReviewClientProps) {
  const [annotations, setAnnotations] =
    useState<AnnotationWithFrame[]>(initialAnnotations);
  const [stats, setStats] = useState<AnnotationReviewStats>(initialStats);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Quick review modal state
  const [quickReviewIndex, setQuickReviewIndex] = useState<number | null>(null);

  // Filter state
  const [filters, setFilters] = useState<{
    source?: "auto" | "manual" | "imported";
    reviewed?: boolean;
    minConfidence?: number;
    maxConfidence?: number;
    labelId?: string;
  }>({});

  // Computed: unreviewed annotations
  const unreviewedAnnotations = useMemo(
    () => annotations.filter((a) => !a.reviewed),
    [annotations]
  );

  // Computed: high confidence unreviewed annotations (80%+)
  const highConfidenceUnreviewed = useMemo(
    () => annotations.filter((a) => !a.reviewed && (a.confidence ?? 0) >= 0.8),
    [annotations]
  );

  // Refresh data
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const [annotationsResult, statsResult] = await Promise.all([
      fetchAnnotations(projectId, {
        source: filters.source,
        reviewed: filters.reviewed,
        min_confidence: filters.minConfidence,
        max_confidence: filters.maxConfidence,
        label_id: filters.labelId,
        limit: 100,
      }),
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
  }, [projectId, filters]);

  // Handle filter change
  const handleFilterChange = useCallback(
    async (newFilters: typeof filters) => {
      setFilters(newFilters);
      setSelectedIds(new Set());
      setIsLoading(true);
      setError(null);

      const result = await fetchAnnotations(projectId, {
        source: newFilters.source,
        reviewed: newFilters.reviewed,
        min_confidence: newFilters.minConfidence,
        max_confidence: newFilters.maxConfidence,
        label_id: newFilters.labelId,
        limit: 100,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setAnnotations(result.annotations ?? []);
      }

      setIsLoading(false);
    },
    [projectId]
  );

  // Selection handlers
  const handleSelectionChange = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(annotations.map((a) => a.id)));
  }, [annotations]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Single item approve
  const handleSingleApprove = useCallback(
    async (id: string) => {
      setError(null);
      const result = await approveAnnotations(projectId, [id]);

      if (result.error) {
        setError(result.error);
      } else {
        setAnnotations((prev) =>
          prev.map((a) => (a.id === id ? { ...a, reviewed: true } : a))
        );
        setStats((prev) => ({
          ...prev,
          reviewed_count: prev.reviewed_count + 1,
          pending_count: prev.pending_count - 1,
        }));
      }
    },
    [projectId]
  );

  // Single item delete
  const handleSingleDelete = useCallback(
    async (id: string) => {
      setError(null);
      const result = await deleteAnnotations(projectId, [id]);

      if (result.error) {
        setError(result.error);
      } else {
        const deletedAnnotation = annotations.find((a) => a.id === id);
        setAnnotations((prev) => prev.filter((a) => a.id !== id));
        setStats((prev) => ({
          ...prev,
          total_count: prev.total_count - 1,
          pending_count: deletedAnnotation?.reviewed
            ? prev.pending_count
            : prev.pending_count - 1,
          reviewed_count: deletedAnnotation?.reviewed
            ? prev.reviewed_count - 1
            : prev.reviewed_count,
        }));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [projectId, annotations]
  );

  // Bulk approve
  const handleBulkApprove = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    setError(null);

    const result = await approveAnnotations(projectId, Array.from(selectedIds));

    if (result.error) {
      setError(result.error);
    } else {
      setAnnotations((prev) =>
        prev.map((a) => (selectedIds.has(a.id) ? { ...a, reviewed: true } : a))
      );
      setStats((prev) => ({
        ...prev,
        reviewed_count:
          prev.reviewed_count + (result.result?.approved_count ?? 0),
        pending_count:
          prev.pending_count - (result.result?.approved_count ?? 0),
      }));
      setSelectedIds(new Set());
    }

    setIsProcessing(false);
  }, [projectId, selectedIds]);

  // Bulk delete
  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);
    setError(null);

    const result = await deleteAnnotations(projectId, Array.from(selectedIds));

    if (result.error) {
      setError(result.error);
    } else {
      setAnnotations((prev) => prev.filter((a) => !selectedIds.has(a.id)));
      setStats((prev) => ({
        ...prev,
        total_count: prev.total_count - (result.result?.deleted_count ?? 0),
        pending_count: Math.max(
          0,
          prev.pending_count - (result.result?.deleted_count ?? 0)
        ),
      }));
      setSelectedIds(new Set());
    }

    setIsProcessing(false);
  }, [projectId, selectedIds]);

  // Approve all unreviewed
  const handleApproveAllUnreviewed = useCallback(async () => {
    const ids = unreviewedAnnotations.map((a) => a.id);
    if (ids.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const result = await approveAnnotations(projectId, ids);

    if (result.error) {
      setError(result.error);
    } else {
      setAnnotations((prev) =>
        prev.map((a) => (!a.reviewed ? { ...a, reviewed: true } : a))
      );
      setStats((prev) => ({
        ...prev,
        reviewed_count:
          prev.reviewed_count + (result.result?.approved_count ?? 0),
        pending_count: 0,
      }));
    }

    setIsProcessing(false);
  }, [projectId, unreviewedAnnotations]);

  // Approve high confidence unreviewed
  const handleApproveHighConfidence = useCallback(async () => {
    const ids = highConfidenceUnreviewed.map((a) => a.id);
    if (ids.length === 0) return;

    setIsProcessing(true);
    setError(null);

    const result = await approveAnnotations(projectId, ids);

    if (result.error) {
      setError(result.error);
    } else {
      const approvedSet = new Set(ids);
      setAnnotations((prev) =>
        prev.map((a) => (approvedSet.has(a.id) ? { ...a, reviewed: true } : a))
      );
      setStats((prev) => ({
        ...prev,
        reviewed_count:
          prev.reviewed_count + (result.result?.approved_count ?? 0),
        pending_count:
          prev.pending_count - (result.result?.approved_count ?? 0),
      }));
    }

    setIsProcessing(false);
  }, [projectId, highConfidenceUnreviewed]);

  // Quick review modal handlers
  const handleOpenQuickReview = useCallback((index: number) => {
    setQuickReviewIndex(index);
  }, []);

  const handleCloseQuickReview = useCallback(() => {
    setQuickReviewIndex(null);
  }, []);

  const handleStartQuickReview = useCallback(() => {
    // Start with first unreviewed annotation
    const firstUnreviewedIndex = annotations.findIndex((a) => !a.reviewed);
    if (firstUnreviewedIndex >= 0) {
      setQuickReviewIndex(firstUnreviewedIndex);
    } else if (annotations.length > 0) {
      setQuickReviewIndex(0);
    }
  }, [annotations]);

  // Count of unreviewed selected
  const selectedUnreviewedCount = useMemo(() => {
    return annotations.filter((a) => selectedIds.has(a.id) && !a.reviewed)
      .length;
  }, [annotations, selectedIds]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <ReviewStats stats={stats} />

      {/* Quick Actions Bar */}
      {unreviewedAnnotations.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 p-4 -mx-4",
            "bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50",
            "dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-blue-950/30",
            "border-y border-blue-200/50 dark:border-blue-800/30"
          )}
        >
          <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
            <span className="font-medium">クイックアクション</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartQuickReview}
              className="gap-2"
            >
              <PlayIcon className="size-4" />
              1件ずつレビュー
            </Button>

            {highConfidenceUnreviewed.length > 0 ? (
              <Button
                size="sm"
                onClick={handleApproveHighConfidence}
                disabled={isProcessing}
                className={cn(
                  "gap-2",
                  "bg-gradient-to-r from-emerald-600 to-emerald-700",
                  "hover:from-emerald-500 hover:to-emerald-600"
                )}
              >
                <CheckIcon className="size-4" />
                信頼度80%+を承認 ({highConfidenceUnreviewed.length})
              </Button>
            ) : null}

            <Button
              size="sm"
              onClick={handleApproveAllUnreviewed}
              disabled={isProcessing}
              className={cn(
                "gap-2",
                "bg-gradient-to-r from-blue-600 to-blue-700",
                "hover:from-blue-500 hover:to-blue-600"
              )}
            >
              <CheckIcon className="size-4" />
              すべて承認 ({unreviewedAnnotations.length})
            </Button>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <ReviewFilters
        labels={labels}
        filters={filters}
        onFilterChange={handleFilterChange}
        onRefresh={refreshData}
        isLoading={isLoading}
      />

      {/* Selection Action Bar */}
      {selectedIds.size > 0 ? (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-3 -mx-4",
            "bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10",
            "border-y border-primary/20",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
        >
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} 件選択中
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="text-xs"
            >
              すべて選択
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeselectAll}
              className="text-xs"
            >
              選択解除
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {selectedUnreviewedCount > 0 ? (
              <Button
                onClick={handleBulkApprove}
                disabled={isProcessing}
                className={cn(
                  "gap-2",
                  "bg-gradient-to-r from-emerald-600 to-emerald-700",
                  "hover:from-emerald-500 hover:to-emerald-600",
                  "shadow-md"
                )}
              >
                <CheckIcon className="size-4" />
                承認 ({selectedUnreviewedCount})
              </Button>
            ) : null}
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="gap-2 shadow-md"
            >
              <TrashIcon className="size-4" />
              削除 ({selectedIds.size})
            </Button>
          </div>
        </div>
      ) : null}

      {/* Error */}
      {error ? (
        <div
          className={cn(
            "flex items-start gap-3 rounded-xl px-5 py-4",
            "bg-red-50 dark:bg-red-950/30",
            "border border-red-200 dark:border-red-900/50",
            "animate-in fade-in slide-in-from-top-2 duration-200"
          )}
        >
          <div className="size-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center shrink-0">
            <svg
              className="size-4 text-red-600 dark:text-red-400"
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              エラーが発生しました
            </p>
            <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-0.5">
              {error}
            </p>
          </div>
        </div>
      ) : null}

      {/* Grid */}
      {isLoading ? (
        <ReviewGridSkeleton />
      ) : annotations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className={cn(
              "size-20 rounded-2xl flex items-center justify-center mb-6",
              "bg-gradient-to-br from-muted/80 to-muted/40",
              "border border-border/50"
            )}
          >
            <svg
              className="size-10 text-muted-foreground/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            アノテーションがありません
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2 max-w-[280px]">
            フィルター条件を変更するか、自動アノテーションを実行してください。
          </p>
        </div>
      ) : (
        <ReviewGrid
          annotations={annotations}
          projectId={projectId}
          selectedIds={selectedIds}
          onSelectionChange={handleSelectionChange}
          onApprove={handleSingleApprove}
          onDelete={handleSingleDelete}
          onOpenQuickReview={handleOpenQuickReview}
        />
      )}

      {/* Quick Review Modal */}
      {quickReviewIndex !== null ? (
        <QuickReviewModal
          annotations={annotations}
          projectId={projectId}
          initialIndex={quickReviewIndex}
          onApprove={handleSingleApprove}
          onDelete={handleSingleDelete}
          onClose={handleCloseQuickReview}
        />
      ) : null}
    </div>
  );
}
