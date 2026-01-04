"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Label } from "@/types/label";

interface FilterState {
  source?: "auto" | "manual" | "imported";
  reviewed?: boolean;
  minConfidence?: number;
  maxConfidence?: number;
  labelId?: string;
}

interface ReviewFiltersProps {
  labels: Label[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onRefresh: () => void;
  isLoading: boolean;
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

export function ReviewFilters({
  labels,
  filters,
  onFilterChange,
  onRefresh,
  isLoading,
}: ReviewFiltersProps) {
  const handleStatusChange = useCallback(
    (reviewed?: boolean) => {
      onFilterChange({ ...filters, reviewed });
    },
    [filters, onFilterChange]
  );

  const handleSourceChange = useCallback(
    (source?: "auto" | "manual" | "imported") => {
      onFilterChange({ ...filters, source });
    },
    [filters, onFilterChange]
  );

  const handleConfidenceChange = useCallback(
    (minConfidence?: number, maxConfidence?: number) => {
      onFilterChange({ ...filters, minConfidence, maxConfidence });
    },
    [filters, onFilterChange]
  );

  const handleLabelChange = useCallback(
    (labelId?: string) => {
      onFilterChange({ ...filters, labelId });
    },
    [filters, onFilterChange]
  );

  const clearFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const hasFilters =
    filters.source !== undefined ||
    filters.reviewed !== undefined ||
    filters.minConfidence !== undefined ||
    filters.maxConfidence !== undefined ||
    filters.labelId !== undefined;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 p-4 -mx-4",
        "bg-gradient-to-r from-muted/30 via-muted/20 to-muted/30",
        "border-y border-border/50"
      )}
    >
      {/* Status Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">
          ステータス:
        </span>
        <FilterChip
          active={filters.reviewed === undefined}
          onClick={() => handleStatusChange(undefined)}
        >
          すべて
        </FilterChip>
        <FilterChip
          active={filters.reviewed === false}
          onClick={() => handleStatusChange(false)}
          colorClass="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
          activeClass="bg-amber-100 dark:bg-amber-900/30"
        >
          未レビュー
        </FilterChip>
        <FilterChip
          active={filters.reviewed === true}
          onClick={() => handleStatusChange(true)}
          colorClass="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
          activeClass="bg-emerald-100 dark:bg-emerald-900/30"
        >
          承認済み
        </FilterChip>
      </div>

      <div className="w-px h-6 bg-border/50" />

      {/* Source Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">
          ソース:
        </span>
        <FilterChip
          active={filters.source === undefined}
          onClick={() => handleSourceChange(undefined)}
        >
          すべて
        </FilterChip>
        <FilterChip
          active={filters.source === "auto"}
          onClick={() => handleSourceChange("auto")}
          colorClass="text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-700"
          activeClass="bg-blue-100 dark:bg-blue-900/30"
        >
          自動
        </FilterChip>
        <FilterChip
          active={filters.source === "manual"}
          onClick={() => handleSourceChange("manual")}
        >
          手動
        </FilterChip>
      </div>

      <div className="w-px h-6 bg-border/50" />

      {/* Confidence Filter */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground font-medium mr-1">
          信頼度:
        </span>
        <FilterChip
          active={
            filters.minConfidence === undefined &&
            filters.maxConfidence === undefined
          }
          onClick={() => handleConfidenceChange(undefined, undefined)}
        >
          すべて
        </FilterChip>
        <FilterChip
          active={filters.maxConfidence === 0.5}
          onClick={() => handleConfidenceChange(undefined, 0.5)}
          colorClass="text-red-600 dark:text-red-400 border-red-300 dark:border-red-700"
          activeClass="bg-red-100 dark:bg-red-900/30"
        >
          低 (&lt;50%)
        </FilterChip>
        <FilterChip
          active={
            filters.minConfidence === 0.5 && filters.maxConfidence === 0.8
          }
          onClick={() => handleConfidenceChange(0.5, 0.8)}
          colorClass="text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700"
          activeClass="bg-amber-100 dark:bg-amber-900/30"
        >
          中 (50-80%)
        </FilterChip>
        <FilterChip
          active={filters.minConfidence === 0.8}
          onClick={() => handleConfidenceChange(0.8, undefined)}
          colorClass="text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
          activeClass="bg-emerald-100 dark:bg-emerald-900/30"
        >
          高 (&gt;80%)
        </FilterChip>
      </div>

      {/* Label Filter */}
      {labels.length > 0 && (
        <>
          <div className="w-px h-6 bg-border/50" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium mr-1">
              ラベル:
            </span>
            <FilterChip
              active={filters.labelId === undefined}
              onClick={() => handleLabelChange(undefined)}
            >
              すべて
            </FilterChip>
            {labels.slice(0, 5).map((label) => (
              <FilterChip
                key={label.id}
                active={filters.labelId === label.id}
                onClick={() => handleLabelChange(label.id)}
              >
                <span
                  className="size-2 rounded-full mr-1.5"
                  style={{ backgroundColor: label.color }}
                />
                {label.name}
              </FilterChip>
            ))}
          </div>
        </>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear Filters */}
      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-xs h-7"
        >
          フィルター解除
        </Button>
      ) : null}

      {/* Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onRefresh}
        disabled={isLoading}
        className="gap-1.5 h-7"
      >
        <RefreshIcon className={cn("size-3.5", isLoading && "animate-spin")} />
        更新
      </Button>
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
  colorClass,
  activeClass,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  colorClass?: string;
  activeClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
        "border transition-all duration-200",
        active
          ? cn(
              "border-primary/50 bg-primary/10 text-primary",
              colorClass && activeClass,
              colorClass
            )
          : "border-border/50 bg-background text-muted-foreground hover:text-foreground hover:border-border"
      )}
    >
      {children}
    </button>
  );
}
