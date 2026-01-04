import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { fetchProject } from "../actions";
import { SearchClient } from "./search-client";

interface SearchPageProps {
  params: Promise<{
    id: string;
  }>;
}

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

export default async function SearchPage({ params }: SearchPageProps) {
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
        <span className="font-medium text-foreground">検索</span>
      </nav>

      {/* Page Header */}
      <header className="space-y-3">
        <div className="flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-foreground/5">
            <SearchIcon className="size-6 text-foreground/70" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">フレーム検索</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              テキストで類似フレームを検索
            </p>
          </div>
        </div>
      </header>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Search Content */}
      <SearchClient projectId={projectId} />
    </div>
  );
}
