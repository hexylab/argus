import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { fetchProject } from "../actions";
import { ExportForm } from "./components/export-form";

interface ExportPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Export icon for page header
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
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
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
      {/* Page Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
            <ExportIcon className="size-6 text-foreground/70" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              データエクスポート
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.name}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground">
          アノテーションデータを機械学習フレームワークで利用可能な形式でエクスポートします。COCO
          または YOLO フォーマットを選択してください。
        </p>
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Export Form */}
      <div className="mx-auto max-w-4xl pb-12">
        <ExportForm projectId={projectId} projectName={project.name} />
      </div>
    </div>
  );
}
