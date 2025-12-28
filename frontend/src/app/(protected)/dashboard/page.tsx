import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { logout } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">ダッシュボード</h1>
        <form action={logout}>
          <Button variant="outline">ログアウト</Button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ようこそ</CardTitle>
          <CardDescription>
            Argus - AI Video Annotation Platform へようこそ
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/50 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              ログイン中のアカウント
            </p>
            <p className="text-lg font-semibold">{user.email}</p>
          </div>
          <p className="text-muted-foreground">
            このダッシュボードから、映像AIモデルの学習データ生成を開始できます。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
