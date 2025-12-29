import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout, fetchProjects } from "./actions";
import { ProjectList } from "./components/project-list";
import { CreateProjectDialog } from "./components/create-project-dialog";

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
          <p className="mt-1 text-muted-foreground">
            映像AIモデルの学習データ生成を管理
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline">ログアウト</Button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight">プロジェクト</h2>
          <CreateProjectDialog />
        </div>

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
            {error}
          </div>
        ) : (
          <ProjectList projects={projects ?? []} />
        )}
      </div>
    </div>
  );
}
