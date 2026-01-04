import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchProject, fetchLabels } from "./actions";
import { ProjectInfoForm } from "./components/project-info-form";
import { LabelManager } from "./components/label-manager";
import { DeleteProjectDialog } from "./components/delete-project-dialog";

interface SettingsPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Icons
function ChevronRight({ className }: { className?: string }) {
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
        d="M8.25 4.5l7.5 7.5-7.5 7.5"
      />
    </svg>
  );
}

function ArrowLeftIcon({ className }: { className?: string }) {
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
        d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
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

function TagIcon({ className }: { className?: string }) {
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
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
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, labelsResult] = await Promise.all([
    fetchProject(projectId),
    fetchLabels(projectId),
  ]);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const labels = labelsResult.labels ?? [];

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-sm">
        <Link
          href="/dashboard"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          ダッシュボード
        </Link>
        <ChevronRight className="size-4 text-muted-foreground/50" />
        <Link
          href={`/projects/${projectId}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          {project.name}
        </Link>
        <ChevronRight className="size-4 text-muted-foreground/50" />
        <span className="font-medium text-foreground">設定</span>
      </nav>

      {/* Page Header */}
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
              <SettingsIcon className="size-6 text-foreground/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                プロジェクト設定
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {project.name}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            プロジェクトの基本情報とラベルを管理します。ラベルはアノテーション時に使用されます。
          </p>
        </div>

        <Link href={`/projects/${projectId}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeftIcon className="size-4" />
            戻る
          </Button>
        </Link>
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Settings Content */}
      <div className="mx-auto max-w-4xl space-y-8 pb-12">
        {/* Project Info Section */}
        <Card className="overflow-hidden border-2">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <FolderIcon className="size-5 text-muted-foreground" />
              基本情報
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ProjectInfoForm project={project} />
          </CardContent>
        </Card>

        {/* Label Management Section */}
        <Card className="overflow-hidden border-2">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2.5 text-base">
              <TagIcon className="size-5 text-muted-foreground" />
              ラベル管理
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <LabelManager projectId={projectId} initialLabels={labels} />
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="overflow-hidden border-2 border-red-200 dark:border-red-900/50">
          <CardHeader className="bg-red-50 dark:bg-red-950/30">
            <CardTitle className="flex items-center gap-2.5 text-base text-red-700 dark:text-red-400">
              <AlertIcon className="size-5" />
              危険ゾーン
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20">
              <div className="space-y-1">
                <p className="font-medium text-foreground">
                  プロジェクトを削除
                </p>
                <p className="text-sm text-muted-foreground">
                  プロジェクトと関連するすべてのデータが完全に削除されます。この操作は取り消せません。
                </p>
              </div>
              <DeleteProjectDialog
                projectId={projectId}
                projectName={project.name}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
