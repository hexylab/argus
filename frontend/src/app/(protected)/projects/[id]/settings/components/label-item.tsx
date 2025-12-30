"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { updateLabelAction, deleteLabelAction } from "../actions";
import type { Label } from "@/types/label";

interface LabelItemProps {
  label: Label;
  projectId: string;
  onUpdate: (label: Label) => void;
  onDelete: (labelId: string) => void;
}

export function LabelItem({
  label,
  projectId,
  onUpdate,
  onDelete,
}: LabelItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(label.name);
  const [color, setColor] = useState(label.color);
  const [description, setDescription] = useState(label.description ?? "");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      setError("ラベル名は必須です");
      return;
    }

    startTransition(async () => {
      const result = await updateLabelAction(projectId, label.id, {
        name: name.trim(),
        color,
        description: description.trim() || null,
      });

      if (result.error) {
        setError(result.error);
      } else if (result.label) {
        onUpdate(result.label);
        setIsEditing(false);
        setError("");
      }
    });
  };

  const handleCancel = () => {
    setName(label.name);
    setColor(label.color);
    setDescription(label.description ?? "");
    setIsEditing(false);
    setError("");
  };

  const handleDelete = () => {
    startDeleteTransition(async () => {
      const result = await deleteLabelAction(projectId, label.id);

      if (result.error) {
        setError(result.error);
      } else {
        onDelete(label.id);
      }
    });
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[auto_1fr_1fr]">
          {/* Color picker */}
          <div className="flex items-center gap-2">
            <label htmlFor={`color-${label.id}`} className="sr-only">
              色
            </label>
            <input
              id={`color-${label.id}`}
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border-0 bg-transparent p-0"
              disabled={isPending}
            />
          </div>

          {/* Name */}
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="ラベル名"
            disabled={isPending}
          />

          {/* Description */}
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="説明（任意）"
            disabled={isPending}
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave} disabled={isPending}>
            {isPending ? "保存中..." : "保存"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isPending}
          >
            キャンセル
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
      {/* Color indicator */}
      <div
        className="size-6 shrink-0 rounded-full ring-2 ring-background shadow-sm"
        style={{ backgroundColor: label.color }}
      />

      {/* Label info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{label.name}</p>
        {label.description ? (
          <p className="text-sm text-muted-foreground truncate">
            {label.description}
          </p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setIsEditing(true)}
          className="h-8 w-8 p-0"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
            />
          </svg>
          <span className="sr-only">編集</span>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isDeleting}
            >
              <svg
                className="size-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
              <span className="sr-only">削除</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ラベルを削除しますか？</AlertDialogTitle>
              <AlertDialogDescription>
                「{label.name}
                」を削除すると、このラベルを使用しているアノテーションにも影響します。
                この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "削除中..." : "削除"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
