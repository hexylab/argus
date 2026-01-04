"use client";

import { useState, useCallback } from "react";
import { performSearch } from "./actions";
import { SearchForm } from "./components/search-form";
import { SearchResults, ResultsSkeleton } from "./components/search-results";
import type { SearchResultItem } from "@/types/search";

const PAGE_SIZE = 20;

interface SearchClientProps {
  projectId: string;
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

  const handleSearch = useCallback(
    async (searchQuery: string) => {
      setQuery(searchQuery);
      setIsLoading(true);
      setError(null);
      setHasSearched(true);

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

  return (
    <div className="space-y-8">
      {/* Search Form */}
      <SearchForm
        onSearch={handleSearch}
        isLoading={isLoading}
        initialQuery={query}
      />

      {/* Error Message */}
      {error ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/50">
          <svg
            className="size-5 shrink-0 text-red-600 dark:text-red-400"
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
          <span className="text-sm font-medium text-red-700 dark:text-red-300">
            {error}
          </span>
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
        />
      ) : null}

      {/* Initial State */}
      {!isLoading && !hasSearched ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <svg
            className="size-12 text-muted-foreground/30 mb-4"
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
          <p className="text-muted-foreground">テキストで類似フレームを検索</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            検索したい内容を入力してください
          </p>
        </div>
      ) : null}
    </div>
  );
}
