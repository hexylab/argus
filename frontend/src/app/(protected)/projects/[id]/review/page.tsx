import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import {
  fetchProject,
  fetchLabels,
  fetchAnnotations,
  fetchStats,
} from "./actions";
import { ReviewClient } from "./review-client";

interface ReviewPageProps {
  params: Promise<{
    id: string;
  }>;
}

// Review icon for page header
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

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { id: projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [projectResult, labelsResult, annotationsResult, statsResult] =
    await Promise.all([
      fetchProject(projectId),
      fetchLabels(projectId),
      fetchAnnotations(projectId, { limit: 100 }),
      fetchStats(projectId),
    ]);

  if (projectResult.error || !projectResult.project) {
    notFound();
  }

  const project = projectResult.project;
  const labels = labelsResult.labels ?? [];
  const initialAnnotations = annotationsResult.annotations ?? [];
  const initialStats = statsResult.stats ?? {
    total_count: 0,
    reviewed_count: 0,
    pending_count: 0,
    auto_count: 0,
    manual_count: 0,
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
            <ReviewIcon className="size-6 text-foreground/70" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              アノテーションレビュー
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {project.name}
            </p>
          </div>
        </div>
        <p className="text-muted-foreground">
          自動生成されたアノテーションを確認し、承認または削除します。
          信頼度の低いアノテーションから優先的に表示されます。
        </p>
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Review Client */}
      <ReviewClient
        projectId={projectId}
        labels={labels}
        initialAnnotations={initialAnnotations}
        initialStats={initialStats}
      />
    </div>
  );
}
