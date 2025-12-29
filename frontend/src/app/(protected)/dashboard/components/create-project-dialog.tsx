"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { createProjectAction } from "../actions";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);

    startTransition(async () => {
      const result = await createProjectAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      setError(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          新規プロジェクト
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-lg",
                "bg-primary/10 text-primary"
              )}
            >
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
                  d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                />
              </svg>
            </span>
            新規プロジェクト作成
          </DialogTitle>
          <DialogDescription>
            プロジェクトの名前と説明を入力してください
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="space-y-4 py-4">
            {error !== null ? (
              <div
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm",
                  "bg-destructive/10 text-destructive",
                  "animate-in fade-in slide-in-from-top-1 duration-200"
                )}
              >
                <svg
                  className="size-4 shrink-0"
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
                {error}
              </div>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">
                プロジェクト名
                <span className="ml-1 text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="例: 交通監視カメラ解析"
                required
                maxLength={255}
                disabled={isPending}
                className="transition-opacity"
              />
              <p className="text-xs text-muted-foreground">
                1〜255文字で入力してください
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                説明
                <span className="ml-1 text-muted-foreground">(任意)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="プロジェクトの目的や内容を記述..."
                rows={3}
                disabled={isPending}
                className="resize-none transition-opacity"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[100px]"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="size-4 animate-spin"
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
                  作成中...
                </span>
              ) : (
                "作成"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
