"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface WorkflowSidebarProps {
  projectId: string;
  projectName: string;
}

// Icons
function DatabaseIcon({ className }: { className?: string }) {
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
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
      />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
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
        d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
      />
    </svg>
  );
}

function ReviewIcon({ className }: { className?: string }) {
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
        d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
      />
    </svg>
  );
}

function ExportIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
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
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
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
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
      />
    </svg>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
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
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNumber: number;
}

export function WorkflowSidebar({
  projectId,
  projectName,
}: WorkflowSidebarProps) {
  const pathname = usePathname();

  const workflowSteps: WorkflowStep[] = [
    {
      id: "data",
      label: "データ",
      description: "映像・データ管理",
      href: `/projects/${projectId}`,
      icon: DatabaseIcon,
      stepNumber: 1,
    },
    {
      id: "search",
      label: "検索",
      description: "フレーム検索・自動アノテーション",
      href: `/projects/${projectId}/search`,
      icon: SearchIcon,
      stepNumber: 2,
    },
    {
      id: "review",
      label: "レビュー",
      description: "アノテーション確認・承認",
      href: `/projects/${projectId}/review`,
      icon: ReviewIcon,
      stepNumber: 3,
    },
    {
      id: "export",
      label: "エクスポート",
      description: "データ出力",
      href: `/projects/${projectId}/export`,
      icon: ExportIcon,
      stepNumber: 4,
    },
  ];

  const settingsStep: WorkflowStep = {
    id: "settings",
    label: "設定",
    description: "プロジェクト設定",
    href: `/projects/${projectId}/settings`,
    icon: SettingsIcon,
    stepNumber: 0,
  };

  const isActive = (step: WorkflowStep) => {
    if (step.id === "data") {
      // データページはexactマッチ、またはvideos配下
      return (
        pathname === `/projects/${projectId}` ||
        pathname.startsWith(`/projects/${projectId}/videos`)
      );
    }
    return pathname.startsWith(step.href);
  };

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Project Header */}
      <div className="border-b border-sidebar-border p-4">
        <Link
          href="/dashboard"
          className="mb-3 flex items-center gap-2 text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground"
        >
          <ChevronLeftIcon className="size-4" />
          ダッシュボード
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
            <FolderIcon className="size-5 text-sidebar-accent-foreground" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-sidebar-foreground">
              {projectName}
            </h2>
            <p className="text-xs text-sidebar-foreground/60">プロジェクト</p>
          </div>
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-2 px-2">
          <span className="text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
            ワークフロー
          </span>
        </div>
        <nav className="space-y-1">
          {workflowSteps.map((step) => {
            const active = isActive(step);
            const Icon = step.icon;

            return (
              <Link
                key={step.id}
                href={step.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "bg-sidebar-border text-sidebar-foreground/60 group-hover:bg-sidebar-primary/50 group-hover:text-sidebar-primary-foreground"
                  )}
                >
                  {step.stepNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Icon className="size-4 shrink-0" />
                    <span className="font-medium">{step.label}</span>
                  </div>
                  <p className="truncate text-xs opacity-70">
                    {step.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Settings */}
      <div className="border-t border-sidebar-border p-3">
        <Link
          href={settingsStep.href}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
            isActive(settingsStep)
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <SettingsIcon className="size-5" />
          <span className="font-medium">設定</span>
        </Link>
      </div>
    </aside>
  );
}
