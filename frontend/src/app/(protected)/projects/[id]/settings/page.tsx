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
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            ダッシュボード
          </Link>
          <svg
            className="size-4 opacity-50"
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
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-foreground transition-colors"
          >
            {project.name}
          </Link>
          <svg
            className="size-4 opacity-50"
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
          <span className="text-foreground">設定</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              プロジェクト設定
            </h1>
            <p className="text-muted-foreground">
              プロジェクトの基本情報とラベルを管理します
            </p>
          </div>

          <Link href={`/projects/${projectId}`}>
            <Button variant="outline" className="gap-2">
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
                  d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
                />
              </svg>
              戻る
            </Button>
          </Link>
        </div>
      </div>

      {/* Project Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="size-5 text-muted-foreground"
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
            基本情報
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectInfoForm project={project} />
        </CardContent>
      </Card>

      {/* Label Management Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="size-5 text-muted-foreground"
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
            ラベル管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LabelManager projectId={projectId} initialLabels={labels} />
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <svg
              className="size-5"
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
            危険ゾーン
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="space-y-1">
              <p className="font-medium">プロジェクトを削除</p>
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
  );
}
