"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  requestImportUploadUrl,
  previewImport,
  startImport,
  getImportStatus,
} from "../actions";
import type { ImportFormat, ImportPreviewResponse } from "@/types/import";

interface ExistingLabel {
  id: string;
  name: string;
  color: string;
}

interface ImportDialogProps {
  projectId: string;
  existingLabels: ExistingLabel[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type Step =
  | "upload"
  | "preview"
  | "mapping"
  | "importing"
  | "complete"
  | "error";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "アップロード" },
  { key: "preview", label: "プレビュー" },
  { key: "mapping", label: "マッピング" },
];

const FORMAT_OPTIONS: {
  value: ImportFormat;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "images_only",
    label: "画像のみ",
    description: "アノテーションなしの画像セット",
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
          d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
        />
      </svg>
    ),
  },
  {
    value: "coco",
    label: "COCO形式",
    description: "annotations.json + 画像フォルダ",
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
          d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
        />
      </svg>
    ),
  },
  {
    value: "yolo",
    label: "YOLO形式",
    description: "data.yaml + labels/ + images/",
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
          d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776"
        />
      </svg>
    ),
  },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`;
}

export function ImportDialog({
  projectId,
  existingLabels,
  open,
  onOpenChange,
  onSuccess,
}: ImportDialogProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<Step>("upload");
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFormat, setSelectedFormat] =
    useState<ImportFormat>("images_only");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importJobId, setImportJobId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [labelMapping, setLabelMapping] = useState<Record<string, string>>({});
  const [importName, setImportName] = useState("");
  const [importProgress, setImportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setSelectedFile(null);
      setUploadProgress(0);
      setImportJobId(null);
      setPreview(null);
      setLabelMapping({});
      setImportName("");
      setImportProgress(0);
      setError(null);
      setIsUploading(false);
    }
  }, [open]);

  // Poll import status
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

  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".zip")) {
        setError("ZIPファイルを選択してください");
        setStep("error");
        return;
      }

      setSelectedFile(file);
      setIsUploading(true);
      setError(null);

      try {
        // Get upload URL
        const urlResult = await requestImportUploadUrl(
          projectId,
          file.name,
          selectedFormat
        );

        if (urlResult.error || !urlResult.data) {
          setError(urlResult.error || "アップロードURLの取得に失敗しました");
          setStep("error");
          setIsUploading(false);
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

        // Get preview
        const previewResult = await previewImport(projectId, import_job_id);

        if (previewResult.error || !previewResult.data) {
          setError(previewResult.error || "プレビューの取得に失敗しました");
          setStep("error");
          setIsUploading(false);
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

        // Move to preview step
        setIsUploading(false);
        setStep("preview");
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        setStep("error");
        setIsUploading(false);
      }
    },
    [projectId, selectedFormat, existingLabels]
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

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFileSelect]
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

  const getStepIndex = (s: Step): number => {
    const idx = STEPS.findIndex((st) => st.key === s);
    return idx >= 0 ? idx : -1;
  };

  const currentStepIndex = getStepIndex(step);
  const showStepIndicator =
    step === "upload" || step === "preview" || step === "mapping";

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 pb-4 mb-4 border-b">
      {STEPS.map((s, idx) => {
        const isActive = s.key === step;
        const isCompleted = currentStepIndex > idx;
        const isClickable = isCompleted && step !== "importing";

        return (
          <div key={s.key} className="flex items-center">
            <button
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && setStep(s.key)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
                isActive && "bg-primary text-primary-foreground",
                isCompleted &&
                  !isActive &&
                  "bg-emerald-500/20 text-emerald-600 hover:bg-emerald-500/30 cursor-pointer",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}
            >
              {isCompleted && !isActive ? (
                <svg
                  className="size-3.5"
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
                <span className="size-4 flex items-center justify-center">
                  {idx + 1}
                </span>
              )}
              <span>{s.label}</span>
            </button>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mx-1 rounded-full transition-colors duration-200",
                  isCompleted ? "bg-emerald-500/40" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">インポート形式</Label>
        <RadioGroup
          value={selectedFormat}
          onValueChange={(v) => setSelectedFormat(v as ImportFormat)}
          className="grid gap-2"
          disabled={isUploading}
        >
          {FORMAT_OPTIONS.map((option) => (
            <div key={option.value} className="relative">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="peer sr-only"
              />
              <Label
                htmlFor={option.value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all duration-200",
                  "hover:bg-muted/50",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                    selectedFormat === option.value
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {option.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
                <div
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full border-2 transition-all duration-200",
                    selectedFormat === option.value
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {selectedFormat === option.value && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200",
          isUploading ? "pointer-events-none" : "cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
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
                : "ZIPファイルをドラッグ&ドロップ"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              または
              <Button
                variant="link"
                className="h-auto p-0 px-1 text-xs"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                ファイルを選択
              </Button>
            </p>
            <p className="mt-2 text-xs text-muted-foreground/70">
              対応形式: ZIP (画像 + アノテーション)
            </p>
          </div>
        </div>
      </div>

      {/* Upload Progress Card */}
      {isUploading && selectedFile ? (
        <div
          className={cn(
            "rounded-lg border p-3 transition-all duration-200",
            uploadProgress === 100
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
                uploadProgress === 100
                  ? "bg-emerald-500/20 text-emerald-600"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {uploadProgress === 100 ? (
                <svg
                  className="size-4 animate-pulse"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                  />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-medium">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
                {uploadProgress < 100
                  ? ` • ${uploadProgress}%`
                  : " • 解析中..."}
              </p>
            </div>
          </div>
          <div className="mt-2">
            <Progress
              value={uploadProgress}
              className={cn("h-1.5", uploadProgress === 100 && "animate-pulse")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

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
        <p className="text-xl font-semibold">インポート完了</p>
        <p className="text-sm text-muted-foreground">
          データセットが正常にインポートされました
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
      case "upload":
        return renderUploadStep();
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
    switch (step) {
      case "upload":
        return "データセットをインポート";
      case "preview":
        return "インポートのプレビュー";
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
    switch (step) {
      case "upload":
        return "COCO/YOLO形式または画像のみのZIPファイルをインポート";
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

        {showStepIndicator ? renderStepIndicator() : null}

        {renderContent()}

        <DialogFooter>
          {step === "upload" && (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUploading}
            >
              キャンセル
            </Button>
          )}

          {step === "preview" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")}>
                戻る
              </Button>
              {preview && preview.labels.length > 0 ? (
                <Button onClick={() => setStep("mapping")}>
                  ラベルマッピング
                </Button>
              ) : (
                <Button onClick={handleStartImport}>インポート開始</Button>
              )}
            </>
          )}

          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>
                戻る
              </Button>
              <Button onClick={handleStartImport}>インポート開始</Button>
            </>
          )}

          {(step === "complete" || step === "error") && (
            <Button onClick={() => onOpenChange(false)}>閉じる</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
