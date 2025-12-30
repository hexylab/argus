"use client";

import type { AnnotationMode } from "@/types/annotation";
import { cn } from "@/lib/utils";

interface AnnotationToolbarProps {
  mode: AnnotationMode;
  onModeChange: (mode: AnnotationMode) => void;
  annotationCount: number;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function AnnotationToolbar({
  mode,
  onModeChange,
  annotationCount,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
}: AnnotationToolbarProps) {
  return (
    <div className="flex items-center gap-2">
      {/* Mode buttons */}
      <div className="flex items-center bg-muted rounded-lg p-1">
        <button
          type="button"
          onClick={() => onModeChange("pan")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
            mode === "pan"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="移動モード (スペースキー)"
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
              d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15"
            />
          </svg>
          移動
        </button>
        <button
          type="button"
          onClick={() => onModeChange("draw")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors",
            mode === "draw"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
          title="描画モード (Dキー)"
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
          描画
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border" />

      {/* Undo/Redo buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            canUndo
              ? "text-foreground hover:bg-muted"
              : "text-muted-foreground/50 cursor-not-allowed"
          )}
          title="元に戻す (Ctrl+Z)"
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
              d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          className={cn(
            "p-1.5 rounded-md transition-colors",
            canRedo
              ? "text-foreground hover:bg-muted"
              : "text-muted-foreground/50 cursor-not-allowed"
          )}
          title="やり直す (Ctrl+Y)"
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
              d="M15 15l6-6m0 0l-6-6m6 6H9a6 6 0 000 12h3"
            />
          </svg>
        </button>
      </div>

      {/* Separator */}
      <div className="w-px h-6 bg-border" />

      {/* Annotation count */}
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
            d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 6h.008v.008H6V6z"
          />
        </svg>
        <span>{annotationCount} 件</span>
      </div>
    </div>
  );
}
