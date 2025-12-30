"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProjectAction } from "../actions";
import type { Project } from "@/types/project";

interface ProjectInfoFormProps {
  project: Project;
}

export function ProjectInfoForm({ project }: ProjectInfoFormProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const hasChanges =
    name !== project.name || description !== (project.description ?? "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setStatus("error");
      setErrorMessage("プロジェクト名は必須です");
      return;
    }

    startTransition(async () => {
      const result = await updateProjectAction(project.id, {
        name: name.trim(),
        description: description.trim() || null,
      });

      if (result.error) {
        setStatus("error");
        setErrorMessage(result.error);
      } else {
        setStatus("success");
        setErrorMessage("");
        // Reset success status after 3 seconds
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="project-name">
            プロジェクト名 <span className="text-destructive">*</span>
          </Label>
          <Input
            id="project-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("idle");
            }}
            placeholder="プロジェクト名を入力"
            disabled={isPending}
            className="transition-colors"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="project-description">説明</Label>
          <Textarea
            id="project-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setStatus("idle");
            }}
            placeholder="プロジェクトの説明を入力（任意）"
            disabled={isPending}
            rows={3}
            className="resize-none transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isPending || !hasChanges}>
          {isPending ? (
            <>
              <svg
                className="mr-2 size-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              保存中...
            </>
          ) : (
            "変更を保存"
          )}
        </Button>

        {status === "success" && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
            保存しました
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
            {errorMessage}
          </div>
        )}
      </div>
    </form>
  );
}
