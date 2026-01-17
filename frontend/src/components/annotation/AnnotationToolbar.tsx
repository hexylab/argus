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
  showAllLabels?: boolean;
  onToggleLabels?: () => void;
  onHelpClick?: () => void;
}

export function AnnotationToolbar({
  mode,
  onModeChange,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  showAllLabels = true,
  onToggleLabels,
  onHelpClick,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-col gap-1">
      {/* Mode buttons */}
      <button
        type="button"
        onClick={() => onModeChange("select")}
        className={cn(
          "p-2 rounded-md transition-colors",
          mode === "select"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="選択モード (V / Q)"
      >
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59"
          />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onModeChange("draw")}
        className={cn(
          "p-2 rounded-md transition-colors",
          mode === "draw"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title="描画モード (R / Q)"
      >
        <svg
          className="size-5"
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
      </button>

      {/* Separator */}
      <div className="h-px w-full bg-border my-1" />

      {/* Undo/Redo buttons */}
      <button
        type="button"
        onClick={onUndo}
        disabled={!canUndo}
        className={cn(
          "p-2 rounded-md transition-colors",
          canUndo
            ? "text-foreground hover:bg-muted"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        title="元に戻す (Ctrl+Z)"
      >
        <svg
          className="size-5"
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
          "p-2 rounded-md transition-colors",
          canRedo
            ? "text-foreground hover:bg-muted"
            : "text-muted-foreground/50 cursor-not-allowed"
        )}
        title="やり直す (Ctrl+Y)"
      >
        <svg
          className="size-5"
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

      {/* Separator */}
      <div className="h-px w-full bg-border my-1" />

      {/* Label visibility toggle */}
      <button
        type="button"
        onClick={onToggleLabels}
        className={cn(
          "p-2 rounded-md transition-colors",
          showAllLabels
            ? "text-foreground bg-muted"
            : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={
          showAllLabels
            ? "選択中のラベルのみ表示 (H)"
            : "全てのラベルを表示 (H)"
        }
      >
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          {showAllLabels ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
            />
          )}
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {/* Separator */}
      <div className="h-px w-full bg-border my-1" />

      {/* Help button */}
      <button
        type="button"
        onClick={onHelpClick}
        className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        title="ヘルプ (?)"
      >
        <svg
          className="size-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
          />
        </svg>
      </button>
    </div>
  );
}
