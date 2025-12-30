import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fetchProject } from "../actions";
import { ExportForm } from "./components/export-form";

interface ExportPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ExportPage({ params }: ExportPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const projectResult = await fetchProject(projectId);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;

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
          <span className="text-foreground">エクスポート</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              データエクスポート
            </h1>
            <p className="text-muted-foreground">
              アノテーションデータを機械学習フレームワークで利用可能な形式でエクスポートします
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

      {/* Export Form */}
      <div className="max-w-3xl">
        <ExportForm projectId={projectId} projectName={project.name} />
      </div>
    </div>
  );
}
