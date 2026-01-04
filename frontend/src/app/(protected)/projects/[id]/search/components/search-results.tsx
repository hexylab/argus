"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/types/search";

interface SearchResultsProps {
  results: SearchResultItem[];
  total: number;
  hasMore: boolean;
  projectId: string;
  isLoadingMore: boolean;
  onLoadMore: () => void;
  selectionMode: boolean;
  selectedFrames: Set<string>;
  onSelectionChange: (frameId: string, selected: boolean) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  // Threshold-based selection
  similarityThreshold: number;
  onThresholdChange: (value: number) => void;
  onSelectAboveThreshold: () => void;
}

interface ResultCardProps {
  result: SearchResultItem;
  projectId: string;
  index: number;
  selectionMode: boolean;
  isSelected: boolean;
  onSelectionChange: (selected: boolean) => void;
}

// Custom checkbox with animation
function SelectionCheckbox({
  checked,
  onClick,
}: {
  checked: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "size-5 rounded-md border-2 flex items-center justify-center",
        "transition-all duration-200 ease-out",
        "shadow-sm backdrop-blur-sm",
        checked
          ? "bg-primary border-primary scale-100"
          : "bg-white/90 dark:bg-black/50 border-white/80 dark:border-white/30 hover:border-primary/50 hover:scale-105"
      )}
    >
      {checked ? (
        <svg
          className="size-3 text-primary-foreground animate-in zoom-in-50 duration-150"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={3}
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
}

// Similarity score badge with gradient
function SimilarityBadge({ score }: { score: number }) {
  // Color based on similarity score
  const getScoreColor = () => {
    if (score >= 0.8) return "from-green-600 to-green-700";
    if (score >= 0.6) return "from-amber-600 to-amber-700";
    return "from-gray-600 to-gray-700";
  };

  return (
    <div
      className={cn(
        "absolute top-2 right-2 px-2 py-1 rounded-md",
        "text-xs font-mono font-medium text-white",
        "bg-gradient-to-br shadow-lg",
        getScoreColor()
      )}
    >
      {score.toFixed(3)}
    </div>
  );
}

function ResultCard({
  result,
  projectId,
  index,
  selectionMode,
  isSelected,
  onSelectionChange,
}: ResultCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSelectionChange(!isSelected);
  };

  const cardContent = (
    <>
      <div className="aspect-video relative overflow-hidden">
        {result.thumbnail_url && !imageError ? (
          <Image
            src={result.thumbnail_url}
            alt={`Frame ${result.frame_number}`}
            fill
            className={cn(
              "object-cover transition-transform duration-300",
              selectionMode
                ? isSelected
                  ? "scale-100"
                  : "group-hover:scale-102"
                : "group-hover:scale-105"
            )}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            onError={() => setImageError(true)}
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <svg
              className="size-8 text-muted-foreground/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
          </div>
        )}

        {/* Selection checkbox */}
        {selectionMode ? (
          <div className="absolute top-2 left-2 z-10">
            <SelectionCheckbox
              checked={isSelected}
              onClick={handleCheckboxClick}
            />
          </div>
        ) : null}

        {/* Hover overlay - only in non-selection mode */}
        {!selectionMode && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center gap-2",
              "bg-gradient-to-t from-black/70 via-black/40 to-transparent",
              "opacity-0 transition-opacity duration-200",
              "group-hover:opacity-100"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm border border-white/30">
              <svg
                className="size-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
              <span className="text-white text-xs font-medium">編集</span>
            </div>
          </div>
        )}

        {/* Selection overlay with subtle gradient */}
        {selectionMode && isSelected ? (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-primary/15 to-transparent pointer-events-none" />
        ) : null}

        {/* Similarity badge */}
        <SimilarityBadge score={result.similarity} />
      </div>

      {/* Frame info with refined typography */}
      <div className="p-2.5 space-y-0.5">
        <p className="text-xs font-semibold tracking-tight">
          フレーム {result.frame_number}
        </p>
        <p className="text-[10px] text-muted-foreground font-mono truncate">
          {result.video_id.slice(0, 8)}
        </p>
      </div>
    </>
  );

  if (selectionMode) {
    return (
      <div
        onClick={() => onSelectionChange(!isSelected)}
        className={cn(
          "group relative overflow-hidden rounded-xl border-2 bg-card cursor-pointer",
          "transition-all duration-200 ease-out",
          "animate-in fade-in slide-in-from-bottom-2",
          isSelected
            ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20"
            : "border-transparent hover:border-muted-foreground/20 hover:shadow-md"
        )}
        style={{
          animationDelay: `${Math.min(index * 25, 250)}ms`,
          animationFillMode: "backwards",
        }}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      href={`/projects/${projectId}/videos/${result.video_id}/frames/${result.frame_id}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border/50 bg-card block",
        "transition-all duration-200 ease-out",
        "hover:border-border hover:shadow-lg hover:-translate-y-0.5",
        "animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
      )}
      style={{
        animationDelay: `${Math.min(index * 25, 250)}ms`,
        animationFillMode: "backwards",
      }}
    >
      {cardContent}
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="size-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
        <svg
          className="size-8 text-muted-foreground/40"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      </div>
      <p className="text-muted-foreground font-medium">検索結果がありません</p>
      <p className="text-sm text-muted-foreground/70 mt-1">
        別のキーワードで検索してください
      </p>
    </div>
  );
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border/50 bg-card overflow-hidden"
          style={{
            animationDelay: `${i * 50}ms`,
          }}
        >
          <div className="aspect-video bg-muted animate-pulse" />
          <div className="p-2.5 space-y-1.5">
            <div className="h-3 bg-muted rounded-md w-16 animate-pulse" />
            <div className="h-2.5 bg-muted rounded-md w-20 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Threshold slider for bulk selection
function ThresholdSelector({
  threshold,
  onThresholdChange,
  onSelectAboveThreshold,
  countAboveThreshold,
}: {
  threshold: number;
  onThresholdChange: (value: number) => void;
  onSelectAboveThreshold: () => void;
  countAboveThreshold: number;
}) {
  // Color based on threshold
  const getThresholdColor = () => {
    if (threshold >= 0.8) return "text-green-600 dark:text-green-400";
    if (threshold >= 0.6) return "text-amber-600 dark:text-amber-400";
    return "text-gray-600 dark:text-gray-400";
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "bg-muted/50 border border-border/50"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg
          className="size-4 text-muted-foreground shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5"
          />
        </svg>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          類似度閾値
        </span>
      </div>

      <div className="flex items-center gap-2 flex-1 min-w-0">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={threshold}
          onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
          className={cn(
            "w-full h-1.5 rounded-full appearance-none cursor-pointer",
            "bg-gradient-to-r from-gray-300 via-amber-400 to-green-500",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:size-3.5",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:border-2",
            "[&::-webkit-slider-thumb]:border-primary",
            "[&::-webkit-slider-thumb]:shadow-md",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:transition-transform",
            "[&::-webkit-slider-thumb]:hover:scale-110"
          )}
        />
        <span
          className={cn(
            "text-sm font-mono font-semibold tabular-nums w-12 text-right",
            getThresholdColor()
          )}
        >
          {threshold.toFixed(2)}
        </span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        onClick={onSelectAboveThreshold}
        disabled={countAboveThreshold === 0}
        className="h-7 text-xs gap-1.5 shrink-0"
      >
        <svg
          className="size-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>一括選択</span>
        <span
          className={cn(
            "px-1 py-0.5 rounded text-[10px] font-bold",
            "bg-primary/10 text-primary tabular-nums"
          )}
        >
          {countAboveThreshold}
        </span>
      </Button>
    </div>
  );
}

// Selection toolbar that appears when in selection mode
function SelectionToolbar({
  selectedCount,
  totalCount,
  allSelected,
  onSelectAll,
  onDeselectAll,
}: {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg",
        "bg-primary/5 border border-primary/20",
        "animate-in fade-in slide-in-from-top-2 duration-200"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-primary animate-pulse" />
        <span className="text-sm font-medium">
          <span className="text-primary tabular-nums">{selectedCount}</span>
          <span className="text-muted-foreground"> / {totalCount} 件選択</span>
        </span>
      </div>
      <div className="flex-1" />
      <Button
        variant="ghost"
        size="sm"
        onClick={allSelected ? onDeselectAll : onSelectAll}
        className="h-7 text-xs"
      >
        {allSelected ? "すべて解除" : "すべて選択"}
      </Button>
    </div>
  );
}

export function SearchResults({
  results,
  total,
  hasMore,
  projectId,
  isLoadingMore,
  onLoadMore,
  selectionMode,
  selectedFrames,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  similarityThreshold,
  onThresholdChange,
  onSelectAboveThreshold,
}: SearchResultsProps) {
  if (results.length === 0) {
    return <EmptyState />;
  }

  const selectedCount = selectedFrames.size;
  const allSelected = selectedCount === results.length && results.length > 0;
  const countAboveThreshold = results.filter(
    (r) => r.similarity >= similarityThreshold
  ).length;

  return (
    <div className="space-y-4">
      {/* Header with count and selection toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          検索結果:{" "}
          <span className="font-semibold text-foreground tabular-nums">
            {total}
          </span>{" "}
          件
        </p>
      </div>

      {/* Threshold selector - show in selection mode */}
      {selectionMode ? (
        <ThresholdSelector
          threshold={similarityThreshold}
          onThresholdChange={onThresholdChange}
          onSelectAboveThreshold={onSelectAboveThreshold}
          countAboveThreshold={countAboveThreshold}
        />
      ) : null}

      {/* Selection toolbar */}
      {selectionMode ? (
        <SelectionToolbar
          selectedCount={selectedCount}
          totalCount={results.length}
          allSelected={allSelected}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
        />
      ) : null}

      {/* Results grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.frame_id}-${index}`}
            result={result}
            projectId={projectId}
            index={index}
            selectionMode={selectionMode}
            isSelected={selectedFrames.has(result.frame_id)}
            onSelectionChange={(selected) =>
              onSelectionChange(result.frame_id, selected)
            }
          />
        ))}
      </div>

      {/* Load more button */}
      {hasMore ? (
        <div className="flex justify-center pt-6">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="min-w-[160px]"
          >
            {isLoadingMore ? (
              <div className="flex items-center gap-2">
                <svg
                  className="size-4 animate-spin"
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
                <span>読み込み中...</span>
              </div>
            ) : (
              "さらに読み込む"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export { ResultsSkeleton };
