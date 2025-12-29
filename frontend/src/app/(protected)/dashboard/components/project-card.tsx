import type { Project } from "@/types/project";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProjectCardProps {
  project: Project;
  index?: number;
}

const statusConfig = {
  active: {
    label: "アクティブ",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    dotClassName: "bg-emerald-500",
  },
  archived: {
    label: "アーカイブ",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    dotClassName: "bg-amber-500",
  },
  deleted: {
    label: "削除済み",
    className: "bg-red-500/10 text-red-600 dark:text-red-400",
    dotClassName: "bg-red-500",
  },
} as const;

export function ProjectCard({ project, index = 0 }: ProjectCardProps) {
  const formattedDate = new Date(project.created_at).toLocaleDateString(
    "ja-JP",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );

  const status = statusConfig[project.status];

  return (
    <Card
      className={cn(
        "group relative cursor-pointer overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20",
        "hover:-translate-y-0.5 hover:border-foreground/20",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{
        animationDelay: `${index * 50}ms`,
        animationFillMode: "backwards",
      }}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-0 transition-opacity duration-300",
          "bg-gradient-to-br from-foreground/[0.02] to-transparent",
          "group-hover:opacity-100"
        )}
      />

      <CardHeader className="relative pb-2">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="line-clamp-1 text-base font-semibold tracking-tight">
            {project.name}
          </CardTitle>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
              status.className
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                status.dotClassName,
                project.status === "active" && "animate-pulse"
              )}
            />
            {status.label}
          </span>
        </div>
        <CardDescription className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed">
          {project.description || "説明がありません"}
        </CardDescription>
      </CardHeader>

      <CardContent className="relative pt-0">
        <div className="flex items-center justify-between border-t border-dashed pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <svg
              className="size-3.5 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
            {formattedDate}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 opacity-0 transition-opacity duration-200",
              "group-hover:opacity-100"
            )}
          >
            詳細を見る
            <svg
              className="size-3 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
