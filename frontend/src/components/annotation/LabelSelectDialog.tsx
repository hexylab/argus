"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Label } from "@/types/label";

interface LabelSelectDialogProps {
  open: boolean;
  labels: Label[];
  onSelect: (labelId: string) => void;
  onCancel: () => void;
}

export function LabelSelectDialog({
  open,
  labels,
  onSelect,
  onCancel,
}: LabelSelectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ラベルを選択</DialogTitle>
          <DialogDescription>
            描画したバウンディングボックスに割り当てるラベルを選択してください
          </DialogDescription>
        </DialogHeader>

        {labels.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-muted-foreground">ラベルが登録されていません</p>
            <p className="text-sm text-muted-foreground mt-1">
              プロジェクト設定からラベルを追加してください
            </p>
          </div>
        ) : (
          <div className="grid gap-2 py-4">
            {labels.map((label) => (
              <button
                key={label.id}
                type="button"
                onClick={() => onSelect(label.id)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg border hover:bg-muted transition-colors text-left"
              >
                <div
                  className="size-4 rounded-full shrink-0"
                  style={{ backgroundColor: label.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{label.name}</p>
                  {label.description ? (
                    <p className="text-sm text-muted-foreground truncate">
                      {label.description}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
