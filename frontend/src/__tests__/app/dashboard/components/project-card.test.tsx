import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectCard } from "@/app/(protected)/dashboard/components/project-card";
import type { Project } from "@/types/project";

describe("ProjectCard", () => {
  const mockProject: Project = {
    id: "123e4567-e89b-12d3-a456-426614174000",
    owner_id: "user-123",
    name: "テストプロジェクト",
    description: "これはテスト用の説明です",
    status: "active",
    settings: {},
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  };

  it("should render project name", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("テストプロジェクト")).toBeInTheDocument();
  });

  it("should render project description", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("これはテスト用の説明です")).toBeInTheDocument();
  });

  it("should show placeholder when description is null", () => {
    const projectWithoutDesc = { ...mockProject, description: null };
    render(<ProjectCard project={projectWithoutDesc} />);

    expect(screen.getByText("説明がありません")).toBeInTheDocument();
  });

  it("should render active status badge", () => {
    render(<ProjectCard project={mockProject} />);

    expect(screen.getByText("アクティブ")).toBeInTheDocument();
  });

  it("should render archived status badge", () => {
    const archivedProject = { ...mockProject, status: "archived" as const };
    render(<ProjectCard project={archivedProject} />);

    expect(screen.getByText("アーカイブ")).toBeInTheDocument();
  });

  it("should render deleted status badge", () => {
    const deletedProject = { ...mockProject, status: "deleted" as const };
    render(<ProjectCard project={deletedProject} />);

    expect(screen.getByText("削除済み")).toBeInTheDocument();
  });

  it("should format and display creation date", () => {
    render(<ProjectCard project={mockProject} />);

    // 日本語ロケールでの日付表示を確認
    // 2024年1月15日 形式
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });
});
