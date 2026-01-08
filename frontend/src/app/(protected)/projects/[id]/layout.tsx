import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { fetchProject } from "./actions";
import { WorkflowSidebar } from "@/components/workflow-sidebar";

interface ProjectLayoutProps {
  children: React.ReactNode;
  params: Promise<{
    id: string;
  }>;
}

export default async function ProjectLayout({
  children,
  params,
}: ProjectLayoutProps) {
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
    <div className="flex h-[calc(100vh-4rem)] -mx-6 -mt-6 lg:-mx-10 lg:-mt-8">
      {/* Sidebar */}
      <WorkflowSidebar projectId={projectId} projectName={project.name} />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
