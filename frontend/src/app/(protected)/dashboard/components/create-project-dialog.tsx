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

// Default color palette for labels
const COLOR_PRESETS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#06B6D4", // cyan
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
];

interface InitialLabel {
  id: string;
  name: string;
  color: string;
}

// Icons
function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function TagIcon({ className }: { className?: string }) {
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
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Label creation state
  const [labels, setLabels] = useState<InitialLabel[]>([]);
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState(COLOR_PRESETS[0]);
  const [showLabelInput, setShowLabelInput] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);

    // Add labels to form data
    formData.set("labels", JSON.stringify(labels));

    startTransition(async () => {
      const result = await createProjectAction(formData);

      if (result.error) {
        setError(result.error);
      } else {
        setOpen(false);
        resetForm();
      }
    });
  }

  function resetForm() {
    setLabels([]);
    setNewLabelName("");
    setNewLabelColor(COLOR_PRESETS[0]);
    setShowLabelInput(false);
    setError(null);
  }

  function handleOpenChange(newOpen: boolean) {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  }

  function handleAddLabel() {
    if (!newLabelName.trim()) return;

    // Check for duplicate names
    if (
      labels.some(
        (l) => l.name.toLowerCase() === newLabelName.trim().toLowerCase()
      )
    ) {
      return;
    }

    setLabels((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: newLabelName.trim(),
        color: newLabelColor,
      },
    ]);
    setNewLabelName("");
    // Cycle to next color
    const currentIndex = COLOR_PRESETS.indexOf(newLabelColor);
    setNewLabelColor(COLOR_PRESETS[(currentIndex + 1) % COLOR_PRESETS.length]);
  }

  function handleRemoveLabel(id: string) {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddLabel();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusIcon className="size-4" />
          新規プロジェクト
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
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
            プロジェクトの基本情報と初期ラベルを設定してください
          </DialogDescription>
        </DialogHeader>
        <form action={handleSubmit}>
          <div className="space-y-5 py-4">
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

            {/* Project Name */}
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                説明
                <span className="ml-1 text-muted-foreground">(任意)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="プロジェクトの目的や内容を記述..."
                rows={2}
                disabled={isPending}
                className="resize-none transition-opacity"
              />
            </div>

            {/* Labels Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium">
                  <TagIcon className="size-4 text-muted-foreground" />
                  初期ラベル
                  <span className="text-muted-foreground font-normal">
                    (任意)
                  </span>
                </Label>
                {!showLabelInput && labels.length === 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowLabelInput(true)}
                    disabled={isPending}
                    className="h-7 gap-1 text-xs"
                  >
                    <PlusIcon className="size-3" />
                    追加
                  </Button>
                ) : null}
              </div>

              {/* Label chips */}
              {labels.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className="group flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-sm"
                    >
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: label.color }}
                      />
                      <span>{label.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveLabel(label.id)}
                        disabled={isPending}
                        className="ml-0.5 rounded-full p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:opacity-100"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              {/* Add label input */}
              {showLabelInput || labels.length > 0 ? (
                <div className="flex items-center gap-2">
                  {/* Color picker */}
                  <div className="flex gap-0.5">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewLabelColor(preset)}
                        disabled={isPending}
                        className={cn(
                          "size-6 rounded-full transition-all hover:scale-110",
                          newLabelColor === preset
                            ? "ring-2 ring-foreground ring-offset-1"
                            : "opacity-60 hover:opacity-100"
                        )}
                        style={{ backgroundColor: preset }}
                      >
                        <span className="sr-only">{preset}</span>
                      </button>
                    ))}
                  </div>

                  {/* Name input */}
                  <Input
                    placeholder="ラベル名を入力..."
                    value={newLabelName}
                    onChange={(e) => setNewLabelName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isPending}
                    className="h-8 flex-1 text-sm"
                  />

                  {/* Add button */}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddLabel}
                    disabled={isPending || !newLabelName.trim()}
                    className="h-8"
                  >
                    追加
                  </Button>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                アノテーションに使用するラベルを設定できます。後から設定ページで追加・編集も可能です。
              </p>
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
