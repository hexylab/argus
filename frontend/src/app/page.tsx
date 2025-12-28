import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">Argus</h1>
        <p className="mt-4 text-xl text-muted-foreground">
          AI Video Annotation Platform
        </p>
        <p className="mt-2 text-muted-foreground">
          映像AIモデルの学習データ生成から学習までを自動化
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="text-base">
            <Link href="/login">ログイン</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-base">
            <Link href="/signup">新規登録</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
