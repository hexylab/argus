"use client";

import { cn } from "@/lib/utils";
import type { AnnotationReviewStats } from "@/types/annotation-review";

interface ReviewStatsProps {
  stats: AnnotationReviewStats;
}

export function ReviewStats({ stats }: ReviewStatsProps) {
  const progressPercent =
    stats.total_count > 0
      ? Math.round((stats.reviewed_count / stats.total_count) * 100)
      : 0;

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-border/50 overflow-hidden",
        "bg-gradient-to-br from-background via-background to-muted/20"
      )}
    >
      {/* Progress Bar */}
      <div className="h-2 bg-muted/50 relative overflow-hidden">
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500",
            progressPercent === 100 && "animate-pulse"
          )}
          style={{ width: `${progressPercent}%` }}
        />
        {/* Shimmer effect */}
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent",
            "animate-shimmer"
          )}
          style={{
            animation: "shimmer 2s infinite",
            backgroundSize: "200% 100%",
          }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-5">
        {/* Progress */}
        <div className="col-span-2 md:col-span-1 flex items-center gap-3">
          <div
            className={cn(
              "size-12 rounded-xl flex items-center justify-center",
              "bg-gradient-to-br from-primary/20 to-primary/10",
              "border border-primary/20"
            )}
          >
            <span className="text-lg font-bold text-primary tabular-nums">
              {progressPercent}%
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              レビュー進捗
            </p>
            <p className="text-sm font-medium">
              {stats.reviewed_count} / {stats.total_count}
            </p>
          </div>
        </div>

        {/* Total */}
        <StatItem
          label="全体"
          value={stats.total_count}
          icon={
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
              />
            </svg>
          }
        />

        {/* Approved */}
        <StatItem
          label="承認済み"
          value={stats.reviewed_count}
          colorClass="text-emerald-600 dark:text-emerald-400"
          bgClass="bg-emerald-500/10"
          icon={
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
          }
        />

        {/* Pending */}
        <StatItem
          label="未レビュー"
          value={stats.pending_count}
          colorClass="text-amber-600 dark:text-amber-400"
          bgClass="bg-amber-500/10"
          icon={
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
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />

        {/* Auto */}
        <StatItem
          label="自動生成"
          value={stats.auto_count}
          colorClass="text-blue-600 dark:text-blue-400"
          bgClass="bg-blue-500/10"
          icon={
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          }
        />
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  icon,
  colorClass = "text-foreground",
  bgClass = "bg-muted/50",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string;
  bgClass?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "size-10 rounded-lg flex items-center justify-center",
          bgClass,
          colorClass
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className={cn("text-lg font-bold tabular-nums", colorClass)}>
          {value.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
