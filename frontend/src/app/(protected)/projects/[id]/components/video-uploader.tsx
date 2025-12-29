"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestUploadUrl, markUploadComplete } from "../actions";

interface VideoUploaderProps {
  projectId: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: "pending" | "uploading" | "completing" | "done" | "error";
  error?: string;
}

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function VideoUploader({ projectId }: VideoUploaderProps) {
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateFileStatus = useCallback(
    (
      id: string,
      updates: Partial<Pick<UploadingFile, "progress" | "status" | "error">>
    ) => {
      setUploadingFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
      );
    },
    []
  );

  const uploadFile = useCallback(
    async (uploadingFile: UploadingFile) => {
      const { id, file } = uploadingFile;

      try {
        // Get presigned URL
        const urlResult = await requestUploadUrl(
          projectId,
          file.name,
          file.type || undefined
        );

        if (urlResult.error || !urlResult.data) {
          updateFileStatus(id, {
            status: "error",
            error: urlResult.error || "アップロードURLの取得に失敗しました",
          });
          return;
        }

        const { video_id, upload_url } = urlResult.data;

        // Upload to S3
        updateFileStatus(id, { status: "uploading", progress: 0 });

        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateFileStatus(id, { progress });
          }
        });

        await new Promise<void>((resolve, reject) => {
          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          });

          xhr.addEventListener("error", () => {
            reject(new Error("Network error during upload"));
          });

          xhr.open("PUT", upload_url);
          if (file.type) {
            xhr.setRequestHeader("Content-Type", file.type);
          }
          xhr.send(file);
        });

        // Mark upload complete
        updateFileStatus(id, { status: "completing", progress: 100 });

        const completeResult = await markUploadComplete(
          projectId,
          video_id,
          file.size
        );

        if (completeResult.error) {
          updateFileStatus(id, {
            status: "error",
            error: completeResult.error,
          });
          return;
        }

        updateFileStatus(id, { status: "done" });

        // Remove from list after delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
        }, 2000);

        // Refresh the page to show new video
        router.refresh();
      } catch (error) {
        console.error("Upload error:", error);
        updateFileStatus(id, {
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "アップロードに失敗しました",
        });
      }
    },
    [projectId, updateFileStatus, router]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter((file) =>
        ACCEPTED_VIDEO_TYPES.includes(file.type)
      );

      if (validFiles.length === 0) {
        alert("対応している映像ファイル形式: MP4, WebM, MOV, AVI, MKV");
        return;
      }

      const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
        id: crypto.randomUUID(),
        file,
        progress: 0,
        status: "pending" as const,
      }));

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Start uploads
      newUploadingFiles.forEach((uf) => uploadFile(uf));
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFiles(files);
      }
    },
    [handleFiles]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFiles(files);
      }
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFiles]
  );

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hasActiveUploads = uploadingFiles.some(
    (f) => f.status === "uploading" || f.status === "completing"
  );

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
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
          accept={ACCEPTED_VIDEO_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div
            className={cn(
              "flex size-16 items-center justify-center rounded-2xl transition-all duration-200",
              isDragOver
                ? "bg-primary/20 text-primary scale-110"
                : "bg-muted text-muted-foreground"
            )}
          >
            <svg
              className="size-8"
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
          </div>

          <div className="text-center">
            <p className="text-sm font-medium">
              {isDragOver
                ? "ドロップしてアップロード"
                : "映像ファイルをドラッグ&ドロップ"}
            </p>
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
            <p className="mt-2 text-xs text-muted-foreground/70">
              対応形式: MP4, WebM, MOV, AVI, MKV
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">アップロード中</h4>
            {hasActiveUploads ? (
              <span className="text-xs text-muted-foreground">
                {uploadingFiles.filter((f) => f.status === "done").length} /{" "}
                {uploadingFiles.length} 完了
              </span>
            ) : null}
          </div>

          <div className="space-y-2">
            {uploadingFiles.map((uf) => (
              <div
                key={uf.id}
                className={cn(
                  "rounded-lg border p-3 transition-all duration-200",
                  uf.status === "error" &&
                    "border-destructive/50 bg-destructive/5",
                  uf.status === "done" &&
                    "border-emerald-500/50 bg-emerald-500/5"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        uf.status === "error"
                          ? "bg-destructive/20 text-destructive"
                          : uf.status === "done"
                            ? "bg-emerald-500/20 text-emerald-600"
                            : "bg-muted text-muted-foreground"
                      )}
                    >
                      {uf.status === "error" ? (
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
                      ) : uf.status === "done" ? (
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
                      ) : (
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
                            d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                          />
                        </svg>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {uf.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(uf.file.size)}
                        {uf.status === "uploading" && ` • ${uf.progress}%`}
                        {uf.status === "completing" && " • 処理中..."}
                        {uf.status === "done" && " • 完了"}
                        {uf.status === "error" && uf.error
                          ? ` • ${uf.error}`
                          : null}
                      </p>
                    </div>
                  </div>
                </div>

                {(uf.status === "uploading" || uf.status === "completing") && (
                  <div className="mt-2">
                    <Progress
                      value={uf.progress}
                      className={cn(
                        "h-1.5",
                        uf.status === "completing" && "animate-pulse"
                      )}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
