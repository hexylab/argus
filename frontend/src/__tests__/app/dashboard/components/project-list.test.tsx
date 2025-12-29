import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectList } from "@/app/(protected)/dashboard/components/project-list";
import type { Project } from "@/types/project";

describe("ProjectList", () => {
  const mockProjects: Project[] = [
    {
      id: "1",
      owner_id: "user-123",
      name: "プロジェクト1",
      description: "説明1",
      status: "active",
      settings: {},
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: "2",
      owner_id: "user-123",
      name: "プロジェクト2",
      description: "説明2",
      status: "archived",
      settings: {},
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z",
    },
  ];

  it("should show empty state when no projects", () => {
    render(<ProjectList projects={[]} />);

    expect(screen.getByText("プロジェクトがありません")).toBeInTheDocument();
    expect(
      screen.getByText(/新しいプロジェクトを作成して/)
    ).toBeInTheDocument();
  });

  it("should render all project cards", () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText("プロジェクト1")).toBeInTheDocument();
    expect(screen.getByText("プロジェクト2")).toBeInTheDocument();
  });

  it("should render project descriptions", () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText("説明1")).toBeInTheDocument();
    expect(screen.getByText("説明2")).toBeInTheDocument();
  });

  it("should render correct status badges", () => {
    render(<ProjectList projects={mockProjects} />);

    expect(screen.getByText("アクティブ")).toBeInTheDocument();
    expect(screen.getByText("アーカイブ")).toBeInTheDocument();
  });

  it("should render single project", () => {
    render(<ProjectList projects={[mockProjects[0]]} />);

    expect(screen.getByText("プロジェクト1")).toBeInTheDocument();
    expect(screen.queryByText("プロジェクト2")).not.toBeInTheDocument();
  });
});
