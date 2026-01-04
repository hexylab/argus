import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout, fetchProjects } from "./actions";
import { ProjectList } from "./components/project-list";
import { CreateProjectDialog } from "./components/create-project-dialog";

// Icons
function LogoutIcon({ className }: { className?: string }) {
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
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
      />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
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
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { projects, error } = await fetchProjects();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <header className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
              <GridIcon className="size-6 text-foreground/70" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                ダッシュボード
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {user.email}
              </p>
            </div>
          </div>
          <p className="text-muted-foreground">
            映像AIモデルの学習データ生成を管理します。
            プロジェクトを作成して映像をアップロードし、アノテーションを行いましょう。
          </p>
        </div>

        <form action={logout}>
          <Button variant="outline" className="gap-2">
            <LogoutIcon className="size-4" />
            ログアウト
          </Button>
        </form>
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Projects Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              プロジェクト
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {projects && projects.length > 0
                ? `${projects.length} 件のプロジェクト`
                : "プロジェクトを作成して始めましょう"}
            </p>
          </div>
          <CreateProjectDialog />
        </div>

        {error ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/50">
            <svg
              className="size-5 shrink-0 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              {error}
            </span>
          </div>
        ) : (
          <ProjectList projects={projects ?? []} />
        )}
      </section>
    </div>
  );
}
