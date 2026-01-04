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
}

interface ResultCardProps {
  result: SearchResultItem;
  projectId: string;
  index: number;
}

function ResultCard({ result, projectId, index }: ResultCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/projects/${projectId}/videos/${result.video_id}/frames/${result.frame_id}`}
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-muted/30 block",
        "transition-all duration-200 hover:shadow-md hover:border-foreground/20",
        "animate-in fade-in slide-in-from-bottom-2 cursor-pointer"
      )}
      style={{
        animationDelay: `${Math.min(index * 30, 300)}ms`,
        animationFillMode: "backwards",
      }}
    >
      <div className="aspect-video relative">
        {result.thumbnail_url && !imageError ? (
          <Image
            src={result.thumbnail_url}
            alt={`Frame ${result.frame_number}`}
            fill
            className="object-cover"
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

        {/* Hover overlay */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-200",
            "group-hover:opacity-100 flex items-center justify-center gap-2"
          )}
        >
          <svg
            className="size-5 text-white"
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
          <span className="text-white text-sm font-medium">アノテーション</span>
        </div>

        {/* Similarity badge */}
        <div className="absolute top-2 right-2 rounded bg-black/70 px-2 py-1 text-xs font-medium text-white">
          {result.similarity.toFixed(4)}
        </div>
      </div>

      {/* Frame info */}
      <div className="p-2 space-y-0.5">
        <p className="text-xs font-medium truncate">
          フレーム {result.frame_number}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          Video: {result.video_id.slice(0, 8)}...
        </p>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
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
      <p className="text-muted-foreground">検索結果がありません</p>
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
          className="rounded-lg border bg-muted/30 overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-muted" />
          <div className="p-2 space-y-1">
            <div className="h-3 bg-muted rounded w-16" />
            <div className="h-3 bg-muted rounded w-24" />
          </div>
        </div>
      ))}
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
}: SearchResultsProps) {
  if (results.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">検索結果: {total} 件</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {results.map((result, index) => (
          <ResultCard
            key={`${result.frame_id}-${index}`}
            result={result}
            projectId={projectId}
            index={index}
          />
        ))}
      </div>

      {hasMore ? (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <svg
                  className="size-4 animate-spin mr-2"
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
                読み込み中...
              </>
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
