"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LabelItem } from "./label-item";
import { CreateLabelDialog } from "./create-label-dialog";
import type { Label } from "@/types/label";

interface LabelManagerProps {
  projectId: string;
  initialLabels: Label[];
}

export function LabelManager({ projectId, initialLabels }: LabelManagerProps) {
  const [labels, setLabels] = useState<Label[]>(initialLabels);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleLabelCreated = (newLabel: Label) => {
    setLabels((prev) => [...prev, newLabel]);
    setShowCreateDialog(false);
  };

  const handleLabelUpdated = (updatedLabel: Label) => {
    setLabels((prev) =>
      prev.map((label) => (label.id === updatedLabel.id ? updatedLabel : label))
    );
  };

  const handleLabelDeleted = (labelId: string) => {
    setLabels((prev) => prev.filter((label) => label.id !== labelId));
  };

  return (
    <div className="space-y-4">
      {/* Header with add button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          アノテーションに使用するラベルを管理します
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCreateDialog(true)}
          className="gap-2"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
          ラベルを追加
        </Button>
      </div>

      {/* Labels list */}
      {labels.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <svg
              className="size-6 text-muted-foreground"
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
          </div>
          <h3 className="mb-1 font-medium">ラベルがありません</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            アノテーションを行うには、まずラベルを追加してください
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
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
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            最初のラベルを作成
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {labels.map((label) => (
            <LabelItem
              key={label.id}
              label={label}
              projectId={projectId}
              onUpdate={handleLabelUpdated}
              onDelete={handleLabelDeleted}
            />
          ))}
        </div>
      )}

      {/* Create dialog */}
      <CreateLabelDialog
        open={showCreateDialog}
        projectId={projectId}
        onOpenChange={setShowCreateDialog}
        onCreated={handleLabelCreated}
      />
    </div>
  );
}
