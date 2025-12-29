import { ProjectCard } from "./project-card";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

interface ProjectListProps {
  projects: Project[];
}

export function ProjectList({ projects }: ProjectListProps) {
  if (projects.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center",
        "rounded-xl border border-dashed py-16",
        "bg-gradient-to-b from-muted/30 to-transparent"
      )}
    >
      <div className="absolute inset-0 overflow-hidden rounded-xl">
        <div
          className={cn(
            "absolute -top-24 left-1/2 size-48 -translate-x-1/2",
            "rounded-full bg-gradient-to-b from-primary/5 to-transparent",
            "blur-2xl"
          )}
        />
      </div>

      <div className="relative flex flex-col items-center gap-4 text-center">
        <div
          className={cn(
            "flex size-16 items-center justify-center rounded-2xl",
            "bg-gradient-to-br from-muted to-muted/50",
            "shadow-sm ring-1 ring-border"
          )}
        >
          <svg
            className="size-7 text-muted-foreground/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-semibold tracking-tight">
            プロジェクトがありません
          </h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            新しいプロジェクトを作成して、
            <br />
            映像アノテーションを始めましょう
          </p>
        </div>
      </div>
    </div>
  );
}
