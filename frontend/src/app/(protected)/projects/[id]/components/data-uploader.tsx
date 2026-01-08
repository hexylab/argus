"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UploadDialog } from "./upload-dialog";

interface ExistingLabel {
  id: string;
  name: string;
  color: string;
}

interface DataUploaderProps {
  projectId: string;
  existingLabels: ExistingLabel[];
  onImportSuccess?: () => void;
}

interface PendingUpload {
  file: File;
  type: "video" | "zip";
}

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

const ACCEPTED_FILE_EXTENSIONS = [
  ".mp4",
  ".webm",
  ".mov",
  ".avi",
  ".mkv",
  ".zip",
];

type DragType = "video" | "zip" | "mixed" | "unknown" | null;

function getFileType(file: File): "video" | "zip" | null {
  if (ACCEPTED_VIDEO_TYPES.includes(file.type)) {
    return "video";
  }
  if (
    file.type === "application/zip" ||
    file.type === "application/x-zip-compressed" ||
    file.name.toLowerCase().endsWith(".zip")
  ) {
    return "zip";
  }
  return null;
}

function detectDragType(e: React.DragEvent): DragType {
  const items = e.dataTransfer.items;
  if (!items || items.length === 0) return "unknown";

  let hasVideo = false;
  let hasZip = false;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (ACCEPTED_VIDEO_TYPES.includes(item.type)) {
      hasVideo = true;
    } else if (
      item.type === "application/zip" ||
      item.type === "application/x-zip-compressed"
    ) {
      hasZip = true;
    }
  }

  if (hasVideo && hasZip) return "mixed";
  if (hasVideo) return "video";
  if (hasZip) return "zip";
  return "unknown";
}

// Icons
function UploadIcon({ className }: { className?: string }) {
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
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
      />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
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
        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
      />
    </svg>
  );
}

function ArchiveIcon({ className }: { className?: string }) {
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
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

export function DataUploader({
  projectId,
  existingLabels,
  onImportSuccess,
}: DataUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragType, setDragType] = useState<DragType>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<PendingUpload | null>(
    null
  );

  const handleFile = useCallback((file: File) => {
    const type = getFileType(file);
    if (type) {
      setPendingUpload({ file, type });
      setUploadDialogOpen(true);
    } else {
      alert(
        "対応形式: 映像 (MP4, WebM, MOV, AVI, MKV) または データセット (ZIP)"
      );
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setDragType(detectDragType(e));
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragType(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      setDragType(null);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUploadDialogClose = useCallback((open: boolean) => {
    setUploadDialogOpen(open);
    if (!open) {
      setPendingUpload(null);
    }
  }, []);

  const handleSuccess = useCallback(() => {
    router.refresh();
    onImportSuccess?.();
  }, [router, onImportSuccess]);

  // Determine icon and text based on drag type
  const dropZoneContent = useMemo(() => {
    if (isDragOver) {
      switch (dragType) {
        case "video":
          return {
            icon: <VideoIcon className="size-8" />,
            title: "ドロップして映像をアップロード",
            iconBg: "bg-blue-500/20 text-blue-500",
          };
        case "zip":
          return {
            icon: <ArchiveIcon className="size-8" />,
            title: "ドロップしてデータセットをインポート",
            iconBg: "bg-emerald-500/20 text-emerald-500",
          };
        case "mixed":
          return {
            icon: <UploadIcon className="size-8" />,
            title: "ドロップしてアップロード",
            iconBg: "bg-primary/20 text-primary",
          };
        default:
          return {
            icon: <UploadIcon className="size-8" />,
            title: "ドロップしてアップロード",
            iconBg: "bg-primary/20 text-primary",
          };
      }
    }

    return {
      icon: <UploadIcon className="size-8" />,
      title: "データをドラッグ&ドロップ",
      iconBg: "bg-muted text-muted-foreground",
    };
  }, [isDragOver, dragType]);

  return (
    <div className="space-y-4">
      {/* Unified Drop Zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200",
          "cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_FILE_EXTENSIONS.join(",")}
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-2xl transition-all duration-200",
              isDragOver
                ? cn(dropZoneContent.iconBg, "scale-110")
                : "bg-muted text-muted-foreground"
            )}
          >
            {dropZoneContent.icon}
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">{dropZoneContent.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              または
              <Button
                variant="link"
                className="h-auto p-0 px-1 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                ファイルを選択
              </Button>
            </p>

            {/* Format hints with visual separation */}
            <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground/70">
              <div className="flex items-center gap-1.5">
                <VideoIcon className="size-3.5" />
                <span>映像: MP4, WebM, MOV, AVI, MKV</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1.5">
                <ArchiveIcon className="size-3.5" />
                <span>データセット: ZIP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dialog */}
      {pendingUpload ? (
        <UploadDialog
          projectId={projectId}
          existingLabels={existingLabels}
          open={uploadDialogOpen}
          onOpenChange={handleUploadDialogClose}
          onSuccess={handleSuccess}
          initialFile={pendingUpload.file}
          fileType={pendingUpload.type}
        />
      ) : null}
    </div>
  );
}
