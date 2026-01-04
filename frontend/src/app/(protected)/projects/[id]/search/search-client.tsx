"use client";

import { useState, useCallback } from "react";
import { performSearch } from "./actions";
import { SearchForm } from "./components/search-form";
import { SearchResults, ResultsSkeleton } from "./components/search-results";
import { AutoAnnotateDialog } from "./components/auto-annotate-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SearchResultItem } from "@/types/search";

const PAGE_SIZE = 20;

interface SearchClientProps {
  projectId: string;
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

export function SearchClient({ projectId }: SearchClientProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFrames, setSelectedFrames] = useState<Set<string>>(new Set());
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5);

  // Auto-annotation dialog state
  const [isAutoAnnotateDialogOpen, setIsAutoAnnotateDialogOpen] =
    useState(false);

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);
      setIsLoading(true);
      setError(null);
      setHasSearched(true);
      // Clear selection when new search is performed
      setSelectedFrames(new Set());

      const result = await performSearch(projectId, {
        query: searchQuery,
        limit: PAGE_SIZE,
        offset: 0,
      });

      if (result.error || !result.data) {
        setError(result.error ?? "検索中にエラーが発生しました");
        setResults([]);
        setTotal(0);
        setHasMore(false);
      } else {
        setResults(result.data.results);
        setTotal(result.data.total);
        setHasMore(result.data.has_more);
      }

      setIsLoading(false);
    },
    [projectId]
  );

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) {
      return;
    }

    setIsLoadingMore(true);

    const result = await performSearch(projectId, {
      query,
      limit: PAGE_SIZE,
      offset: results.length,
    });

    if (result.error || !result.data) {
      setError(result.error ?? "読み込み中にエラーが発生しました");
    } else {
      setResults((prev) => [...prev, ...result.data!.results]);
      setTotal(result.data.total);
      setHasMore(result.data.has_more);
    }

    setIsLoadingMore(false);
  }, [projectId, query, results.length, isLoadingMore, hasMore]);

  const handleSelectionChange = useCallback(
    (frameId: string, selected: boolean) => {
      setSelectedFrames((prev) => {
        const next = new Set(prev);
        if (selected) {
          next.add(frameId);
        } else {
          next.delete(frameId);
        }
        return next;
      });
    },
    []
  );

  const handleSelectAll = useCallback(() => {
    setSelectedFrames(new Set(results.map((r) => r.frame_id)));
  }, [results]);

  const handleDeselectAll = useCallback(() => {
    setSelectedFrames(new Set());
  }, []);

  const handleThresholdChange = useCallback((value: number) => {
    setSimilarityThreshold(value);
  }, []);

  const handleSelectAboveThreshold = useCallback(() => {
    const framesAboveThreshold = results
      .filter((r) => r.similarity >= similarityThreshold)
      .map((r) => r.frame_id);
    setSelectedFrames(new Set(framesAboveThreshold));
  }, [results, similarityThreshold]);

  const toggleSelectionMode = useCallback(() => {
    setSelectionMode((prev) => {
      if (prev) {
        // Exiting selection mode - clear selection
        setSelectedFrames(new Set());
      }
      return !prev;
    });
  }, []);

  const handleAutoAnnotateComplete = useCallback(() => {
    // Clear selection after successful auto-annotation
    setSelectedFrames(new Set());
    setSelectionMode(false);
  }, []);

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <SearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        initialQuery={query}
      />

      {/* Action Bar - Selection Mode Toggle & Auto-Annotation Button */}
      {hasSearched && results.length > 0 && !isLoading ? (
        <div
          className={cn(
            "flex items-center justify-between gap-4 px-4 py-3 -mx-4",
            "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50",
            "border-y border-border/50",
            "animate-in fade-in slide-in-from-top-2 duration-300"
          )}
        >
          <Button
            variant={selectionMode ? "default" : "outline"}
            size="sm"
            onClick={toggleSelectionMode}
            className={cn(
              "gap-2 transition-all duration-200",
              selectionMode && "shadow-md"
            )}
          >
            {selectionMode ? (
              <>
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                選択モード終了
              </>
            ) : (
              <>
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
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                フレームを選択
              </>
            )}
          </Button>

          {/* Auto-annotation button with animation */}
          {selectionMode && selectedFrames.size > 0 ? (
            <Button
              onClick={() => setIsAutoAnnotateDialogOpen(true)}
              className={cn(
                "gap-2 shadow-lg",
                "bg-gradient-to-r from-primary to-primary/90",
                "hover:from-primary/90 hover:to-primary/80",
                "animate-in fade-in slide-in-from-right-4 duration-300"
              )}
            >
              <SparkleIcon className="size-4" />
              <span>自動アノテーション</span>
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 rounded-md text-xs font-bold",
                  "bg-white/20 tabular-nums"
                )}
              >
                {selectedFrames.size}
              </span>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Error Message */}
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

      {/* Loading State */}
      {isLoading ? <ResultsSkeleton /> : null}

      {/* Search Results */}
      {!isLoading && hasSearched ? (
        <SearchResults
          results={results}
          total={total}
          hasMore={hasMore}
          projectId={projectId}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          selectionMode={selectionMode}
          selectedFrames={selectedFrames}
          onSelectionChange={handleSelectionChange}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          similarityThreshold={similarityThreshold}
          onThresholdChange={handleThresholdChange}
          onSelectAboveThreshold={handleSelectAboveThreshold}
        />
      ) : null}

      {/* Initial State */}
      {!isLoading && !hasSearched ? (
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
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            テキストで類似フレームを検索
          </p>
          <p className="text-sm text-muted-foreground/70 mt-2 max-w-[280px]">
            検索したい内容を入力してください。AIが類似度の高いフレームを見つけます。
          </p>
        </div>
      ) : null}

      {/* Auto-Annotation Dialog */}
      <AutoAnnotateDialog
        open={isAutoAnnotateDialogOpen}
        onOpenChange={setIsAutoAnnotateDialogOpen}
        projectId={projectId}
        selectedFrameIds={Array.from(selectedFrames)}
        onComplete={handleAutoAnnotateComplete}
      />
    </div>
  );
}
