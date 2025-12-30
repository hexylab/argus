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
} from "@/components/ui/dialog";
import { createLabelAction } from "../actions";
import type { Label as LabelType } from "@/types/label";

// Default color palette for quick selection
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

interface CreateLabelDialogProps {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onCreated: (label: LabelType) => void;
}

export function CreateLabelDialog({
  open,
  projectId,
  onOpenChange,
  onCreated,
}: CreateLabelDialogProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const [description, setDescription] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("ラベル名は必須です");
      return;
    }

    startTransition(async () => {
      const result = await createLabelAction(projectId, {
        name: name.trim(),
        color,
        description: description.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.label) {
        onCreated(result.label);
        // Reset form
        setName("");
        setColor(COLOR_PRESETS[0]);
        setDescription("");
        setError("");
      }
    });
  };

  const handleClose = () => {
    if (!isPending) {
      onOpenChange(false);
      // Reset form on close
      setName("");
      setColor(COLOR_PRESETS[0]);
      setDescription("");
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>ラベルを追加</DialogTitle>
            <DialogDescription>
              アノテーションに使用する新しいラベルを作成します
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Color selection */}
            <div className="space-y-2">
              <Label>色</Label>
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setColor(preset)}
                      className={`size-7 rounded-full transition-transform hover:scale-110 ${
                        color === preset
                          ? "ring-2 ring-foreground ring-offset-2"
                          : ""
                      }`}
                      style={{ backgroundColor: preset }}
                    >
                      <span className="sr-only">{preset}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {color.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="label-name">
                ラベル名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="label-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError("");
                }}
                placeholder="例: 人物、車、建物"
                disabled={isPending}
                autoFocus
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="label-description">説明</Label>
              <Textarea
                id="label-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="このラベルの説明（任意）"
                disabled={isPending}
                rows={2}
                className="resize-none"
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
            >
              キャンセル
            </Button>
            <Button type="submit" disabled={isPending}>
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
                  作成中...
                </>
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
