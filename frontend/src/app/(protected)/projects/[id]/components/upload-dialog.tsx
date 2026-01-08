"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  requestUploadUrl,
  markUploadComplete,
  requestImportUploadUrl,
  previewImport,
  startImport,
  getImportStatus,
} from "../actions";
import type { ImportPreviewResponse } from "@/types/import";

interface ExistingLabel {
  id: string;
  name: string;
  color: string;
}

interface UploadDialogProps {
  projectId: string;
  existingLabels: ExistingLabel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialFile: File;
  fileType: "video" | "zip";
}

type Step =
  | "processing"
  | "preview"
  | "mapping"
  | "importing"
  | "complete"
  | "error";

type ProcessingPhase = "uploading" | "analyzing" | "done";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

// Processing phase indicator component for videos
function VideoProcessingIndicator({
  phase,
  progress,
  fileName,
  fileSize,
}: {
  phase: ProcessingPhase;
  progress: number;
  fileName: string;
  fileSize: number;
}) {
  const phases: {
    key: ProcessingPhase;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "uploading",
      label: "アップロード中",
      icon: (
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
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      ),
    },
    {
      key: "analyzing",
      label: "処理中",
      icon: (
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
            d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
          />
        </svg>
      ),
    },
    {
      key: "done",
      label: "完了",
      icon: (
        <svg
          className="size-5"
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
      ),
    },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="space-y-6">
      {/* File info card */}
      <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <svg
              className="size-6"
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
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress phases */}
      <div className="flex items-center justify-between gap-2">
        {phases.map((p, idx) => {
          const isActive = p.key === phase;
          const isCompleted = idx < currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={p.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
                  isActive &&
                    "bg-blue-500 text-white shadow-lg shadow-blue-500/25 scale-110",
                  isCompleted && "bg-emerald-500/20 text-emerald-600",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className={cn(isActive && "animate-pulse")}>
                    {p.icon}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive && "text-blue-500",
                    isCompleted && "text-emerald-600",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {p.label}
                </p>
              </div>
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-all duration-500",
                    isCompleted ? "bg-emerald-500/40" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress
          value={phase === "analyzing" ? 100 : progress}
          className={cn("h-2", phase === "analyzing" && "animate-pulse")}
        />
        <p className="text-center text-sm text-muted-foreground">
          {phase === "uploading" && `${progress}% アップロード済み`}
          {phase === "analyzing" && "映像を処理しています..."}
          {phase === "done" && "アップロード完了"}
        </p>
      </div>
    </div>
  );
}

// Processing phase indicator component for ZIPs
function ZipProcessingIndicator({
  phase,
  progress,
  fileName,
  fileSize,
}: {
  phase: ProcessingPhase;
  progress: number;
  fileName: string;
  fileSize: number;
}) {
  const phases: {
    key: ProcessingPhase;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "uploading",
      label: "アップロード中",
      icon: (
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
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
          />
        </svg>
      ),
    },
    {
      key: "analyzing",
      label: "解析中",
      icon: (
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
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
      ),
    },
    {
      key: "done",
      label: "完了",
      icon: (
        <svg
          className="size-5"
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
      ),
    },
  ];

  const currentIndex = phases.findIndex((p) => p.key === phase);

  return (
    <div className="space-y-6">
      {/* File info card */}
      <div className="rounded-xl border bg-gradient-to-br from-muted/50 to-muted/20 p-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <svg
              className="size-6"
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
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{fileName}</p>
            <p className="text-sm text-muted-foreground">
              {formatFileSize(fileSize)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress phases */}
      <div className="flex items-center justify-between gap-2">
        {phases.map((p, idx) => {
          const isActive = p.key === phase;
          const isCompleted = idx < currentIndex;
          const isPending = idx > currentIndex;

          return (
            <div key={p.key} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500",
                  isActive &&
                    "bg-primary text-primary-foreground shadow-lg shadow-primary/25 scale-110",
                  isCompleted && "bg-emerald-500/20 text-emerald-600",
                  isPending && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <div className={cn(isActive && "animate-pulse")}>
                    {p.icon}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 hidden sm:block">
                <p
                  className={cn(
                    "text-xs font-medium transition-colors duration-300",
                    isActive && "text-primary",
                    isCompleted && "text-emerald-600",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {p.label}
                </p>
              </div>
              {idx < phases.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 rounded-full transition-all duration-500",
                    isCompleted ? "bg-emerald-500/40" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress
          value={phase === "analyzing" ? 100 : progress}
          className={cn("h-2", phase === "analyzing" && "animate-pulse")}
        />
        <p className="text-center text-sm text-muted-foreground">
          {phase === "uploading" && `${progress}% アップロード済み`}
          {phase === "analyzing" && "データセットを解析しています..."}
          {phase === "done" && "準備完了"}
        </p>
      </div>
    </div>
  );
}

export function UploadDialog({
  projectId,
  existingLabels,
  open,
  onOpenChange,
  onSuccess,
  initialFile,
  fileType,
}: UploadDialogProps) {
  const router = useRouter();

  // State
  const [step, setStep] = useState<Step>("processing");
  const [processingPhase, setProcessingPhase] =
    useState<ProcessingPhase>("uploading");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [labelMapping, setLabelMapping] = useState<Record<string, string>>({});
  const [importName, setImportName] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("processing");
      setProcessingPhase("uploading");
      setUploadProgress(0);
      setImportJobId(null);
      setPreview(null);
      setLabelMapping({});
      setImportName("");
      setImportProgress(0);
      setError(null);
      setHasStarted(false);
    }
  }, [open]);

  // Start upload when dialog opens
  useEffect(() => {
    if (open && initialFile && !hasStarted) {
      setHasStarted(true);
      if (fileType === "video") {
        handleVideoUpload(initialFile);
      } else {
        handleZipUpload(initialFile);
      }
    }
  }, [open, initialFile, hasStarted, fileType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll import status for ZIP
  useEffect(() => {
    if (step !== "importing" || !importJobId) return;

    const interval = setInterval(async () => {
      const result = await getImportStatus(projectId, importJobId);
      if (result.data) {
        setImportProgress(result.data.progress);

        if (result.data.status === "completed") {
          clearInterval(interval);
          setStep("complete");
          router.refresh();
          onSuccess?.();
        } else if (result.data.status === "failed") {
          clearInterval(interval);
          setError(result.data.error_message || "インポートに失敗しました");
          setStep("error");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, importJobId, projectId, router, onSuccess]);

  // Handle video upload
  const handleVideoUpload = useCallback(
    async (file: File) => {
      setStep("processing");
      setProcessingPhase("uploading");
      setError(null);

      try {
        const urlResult = await requestUploadUrl(
          projectId,
          file.name,
          file.type || undefined
        );

        if (urlResult.error || !urlResult.data) {
          setError(urlResult.error || "アップロードURLの取得に失敗しました");
          setStep("error");
          return;
        }

        const { video_id, upload_url } = urlResult.data;

        // Upload file
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
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
            reject(new Error("ネットワークエラー"));
          });

          xhr.open("PUT", upload_url);
          if (file.type) {
            xhr.setRequestHeader("Content-Type", file.type);
          }
          xhr.send(file);
        });

        // Processing phase
        setProcessingPhase("analyzing");

        const completeResult = await markUploadComplete(
          projectId,
          video_id,
          file.size
        );

        if (completeResult.error) {
          setError(completeResult.error);
          setStep("error");
          return;
        }

        // Show done phase briefly
        setProcessingPhase("done");
        await new Promise((r) => setTimeout(r, 800));

        // Complete and close
        setStep("complete");
        router.refresh();
        onSuccess?.();

        // Auto-close after brief delay
        setTimeout(() => {
          onOpenChange(false);
        }, 1200);
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        setStep("error");
      }
    },
    [projectId, router, onSuccess, onOpenChange]
  );

  // Handle ZIP upload
  const handleZipUpload = useCallback(
    async (file: File) => {
      setStep("processing");
      setProcessingPhase("uploading");
      setError(null);

      try {
        const urlResult = await requestImportUploadUrl(
          projectId,
          file.name,
          "images_only"
        );

        if (urlResult.error || !urlResult.data) {
          setError(urlResult.error || "アップロードURLの取得に失敗しました");
          setStep("error");
          return;
        }

        const { import_job_id, upload_url } = urlResult.data;
        setImportJobId(import_job_id);

        // Upload file
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
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
            reject(new Error("ネットワークエラー"));
          });

          xhr.open("PUT", upload_url);
          xhr.setRequestHeader("Content-Type", "application/zip");
          xhr.send(file);
        });

        // Switch to analyzing phase
        setProcessingPhase("analyzing");

        // Get preview
        const previewResult = await previewImport(projectId, import_job_id);

        if (previewResult.error || !previewResult.data) {
          setError(previewResult.error || "プレビューの取得に失敗しました");
          setStep("error");
          return;
        }

        setPreview(previewResult.data);

        // Initialize label mapping
        const initialMapping: Record<string, string> = {};
        previewResult.data.labels.forEach((label) => {
          const match = existingLabels.find(
            (el) => el.name.toLowerCase() === label.name.toLowerCase()
          );
          if (match) {
            initialMapping[label.name] = match.id;
          }
        });
        setLabelMapping(initialMapping);

        // Set default import name
        setImportName(file.name.replace(".zip", ""));

        // Brief pause to show completion, then transition
        setProcessingPhase("done");
        await new Promise((r) => setTimeout(r, 600));

        // Move to preview step
        setStep("preview");
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        setStep("error");
      }
    },
    [projectId, existingLabels]
  );

  const handleStartImport = useCallback(async () => {
    if (!importJobId) return;

    setStep("importing");

    const result = await startImport(projectId, importJobId, {
      label_mapping: Object.keys(labelMapping).length > 0 ? labelMapping : null,
      name: importName || null,
    });

    if (result.error) {
      setError(result.error);
      setStep("error");
    }
  }, [importJobId, projectId, labelMapping, importName]);

  const renderProcessingStep = () => {
    if (fileType === "video") {
      return (
        <VideoProcessingIndicator
          phase={processingPhase}
          progress={uploadProgress}
          fileName={initialFile.name}
          fileSize={initialFile.size}
        />
      );
    }
    return (
      <ZipProcessingIndicator
        phase={processingPhase}
        progress={uploadProgress}
        fileName={initialFile.name}
        fileSize={initialFile.size}
      />
    );
  };

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Preview Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
            </div>
          </div>
          <div className="text-xs text-muted-foreground">検出された形式</div>
          <div className="text-lg font-semibold mt-0.5">
            {preview?.format === "coco"
              ? "COCO"
              : preview?.format === "yolo"
                ? "YOLO"
                : "画像のみ"}
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
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
                  d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                />
              </svg>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">画像数</div>
          <div className="text-lg font-semibold mt-0.5">
            {preview?.total_images.toLocaleString()}
            <span className="text-sm font-normal text-muted-foreground ml-1">
              枚
            </span>
          </div>
        </div>
      </div>

      {/* Labels Preview */}
      {preview && preview.labels.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">検出されたラベル</Label>
            <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
              {preview.labels.length} 種類
            </span>
          </div>
          <div className="rounded-lg border divide-y max-h-40 overflow-y-auto">
            {preview.labels.map((label, idx) => (
              <div
                key={label.name}
                className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-3 rounded-full"
                    style={{
                      backgroundColor: `hsl(${(idx * 137) % 360}, 70%, 50%)`,
                    }}
                  />
                  <span className="text-sm font-medium">{label.name}</span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {label.count.toLocaleString()} 件
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Import Name */}
      <div className="space-y-2">
        <Label htmlFor="import-name" className="text-sm font-medium">
          データセット名
        </Label>
        <Input
          id="import-name"
          value={importName}
          onChange={(e) => setImportName(e.target.value)}
          placeholder="インポートするデータセットの名前"
          className="transition-all duration-200 focus:ring-2 focus:ring-primary/20"
        />
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm text-muted-foreground">
          インポートするラベルを既存のラベルにマッピングできます。
          マッピングしない場合は新しいラベルが作成されます。
        </p>
      </div>

      <div className="rounded-lg border divide-y max-h-72 overflow-y-auto">
        {preview?.labels.map((label, idx) => {
          const mappedLabel = existingLabels.find(
            (el) => el.id === labelMapping[label.name]
          );

          return (
            <div
              key={label.name}
              className="flex items-center gap-3 p-3 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <div
                  className="size-3 rounded-full shrink-0"
                  style={{
                    backgroundColor: `hsl(${(idx * 137) % 360}, 70%, 50%)`,
                  }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {label.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {label.count.toLocaleString()} 件
                  </div>
                </div>
              </div>

              <svg
                className="size-4 text-muted-foreground/50 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>

              <div className="relative">
                <select
                  value={labelMapping[label.name] || ""}
                  onChange={(e) =>
                    setLabelMapping((prev) => ({
                      ...prev,
                      [label.name]: e.target.value,
                    }))
                  }
                  className={cn(
                    "w-44 rounded-lg border bg-background pl-8 pr-3 py-2 text-sm appearance-none",
                    "transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:border-primary",
                    "cursor-pointer hover:bg-muted/30"
                  )}
                >
                  <option value="">+ 新規作成</option>
                  {existingLabels.map((el) => (
                    <option key={el.id} value={el.id}>
                      {el.name}
                    </option>
                  ))}
                </select>
                <div
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 rounded-full"
                  style={{
                    backgroundColor: mappedLabel
                      ? mappedLabel.color
                      : "#9ca3af",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="relative">
        <div className="size-20 rounded-full border-4 border-muted" />
        <div
          className="absolute inset-0 size-20 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: "1s" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold tabular-nums">
            {importProgress.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-center space-y-1">
        <p className="text-base font-medium">インポート中...</p>
        <p className="text-sm text-muted-foreground">しばらくお待ちください</p>
      </div>

      <Progress value={importProgress} className="w-full max-w-xs h-2" />
    </div>
  );

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
        <svg
          className="size-10"
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
      </div>

      <div className="text-center space-y-2">
        <p className="text-xl font-semibold">
          {fileType === "video" ? "アップロード完了" : "インポート完了"}
        </p>
        <p className="text-sm text-muted-foreground">
          {fileType === "video"
            ? "映像が正常にアップロードされました"
            : "データセットが正常にインポートされました"}
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      <div className="flex size-20 items-center justify-center rounded-full bg-destructive/20 text-destructive">
        <svg
          className="size-10"
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
      </div>

      <div className="text-center space-y-2">
        <p className="text-xl font-semibold">エラーが発生しました</p>
        <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (step) {
      case "processing":
        return renderProcessingStep();
      case "preview":
        return renderPreviewStep();
      case "mapping":
        return renderMappingStep();
      case "importing":
        return renderImportingStep();
      case "complete":
        return renderCompleteStep();
      case "error":
        return renderErrorStep();
    }
  };

  const getTitle = () => {
    if (fileType === "video") {
      switch (step) {
        case "processing":
          return "映像をアップロード中";
        case "complete":
          return "完了";
        case "error":
          return "エラー";
        default:
          return "映像をアップロード";
      }
    }

    switch (step) {
      case "processing":
        return "データセットを処理中";
      case "preview":
        return "インポート内容";
      case "mapping":
        return "ラベルマッピング";
      case "importing":
        return "インポート中";
      case "complete":
        return "完了";
      case "error":
        return "エラー";
    }
  };

  const getDescription = () => {
    if (fileType === "video") {
      switch (step) {
        case "processing":
          return "映像ファイルをアップロードしています";
        default:
          return undefined;
      }
    }

    switch (step) {
      case "processing":
        return "ファイルをアップロードして解析しています";
      case "preview":
        return "インポート内容を確認してください";
      case "mapping":
        return "既存ラベルとのマッピングを設定";
      default:
        return undefined;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          {getDescription() ? (
            <DialogDescription>{getDescription()}</DialogDescription>
          ) : null}
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {step === "processing" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={processingPhase !== "uploading"}
            >
              キャンセル
            </Button>
          )}

          {step === "preview" ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              {preview && preview.labels.length > 0 ? (
                <Button onClick={() => setStep("mapping")}>
                  ラベルマッピング
                </Button>
              ) : (
                <Button onClick={handleStartImport}>インポート開始</Button>
              )}
            </>
          ) : null}

          {step === "mapping" ? (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                戻る
              </Button>
              <Button onClick={handleStartImport}>インポート開始</Button>
            </>
          ) : null}

          {step === "complete" || step === "error" ? (
            <Button onClick={() => onOpenChange(false)}>閉じる</Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
