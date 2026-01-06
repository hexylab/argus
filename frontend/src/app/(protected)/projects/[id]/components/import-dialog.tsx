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

const FORMAT_OPTIONS: {
  value: ImportFormat;
  label: string;
  description: string;
}[] = [
  {
    value: "images_only",
    label: "画像のみ",
    description: "アノテーションなしの画像セット",
  },
  {
    value: "coco",
    label: "COCO形式",
    description: "annotations.json + 画像フォルダ",
  },
  {
    value: "yolo",
    label: "YOLO形式",
    description: "data.yaml + labels/ + images/",
  },
];

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
        setStep("preview");
      } catch (err) {
        console.error("Upload error:", err);
        setError(
          err instanceof Error ? err.message : "アップロードに失敗しました"
        );
        setStep("error");
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

  const renderUploadStep = () => (
    <div className="space-y-6">
      {/* Format Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">インポート形式</Label>
        <RadioGroup
          value={selectedFormat}
          onValueChange={(v) => setSelectedFormat(v as ImportFormat)}
          className="grid gap-2"
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
                  "flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all",
                  "hover:bg-muted/50",
                  "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                )}
              >
                <div
                  className={cn(
                    "flex size-4 items-center justify-center rounded-full border-2",
                    "peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary"
                  )}
                >
                  {selectedFormat === option.value && (
                    <div className="size-2 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{option.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {option.description}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer",
          isDragOver
            ? "border-primary bg-primary/5 scale-[1.01]"
            : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/30"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center justify-center gap-4 p-8">
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-2xl transition-all duration-200",
              isDragOver
                ? "bg-primary/20 text-primary scale-110"
                : "bg-muted text-muted-foreground"
            )}
          >
            <svg
              className="size-7"
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
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                ファイルを選択
              </Button>
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {selectedFile && uploadProgress < 100 ? (
          <div className="absolute inset-x-4 bottom-4">
            <div className="rounded-lg border bg-background/95 p-3 backdrop-blur-sm">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium truncate">
                  {selectedFile.name}
                </span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      {/* Preview Summary */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground">検出された形式</div>
            <div className="text-sm font-medium mt-1">
              {preview?.format === "coco"
                ? "COCO"
                : preview?.format === "yolo"
                  ? "YOLO"
                  : "画像のみ"}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">画像数</div>
            <div className="text-sm font-medium mt-1">
              {preview?.total_images.toLocaleString()} 枚
            </div>
          </div>
        </div>
      </div>

      {/* Labels Preview */}
      {preview && preview.labels.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">検出されたラベル</Label>
            <span className="text-xs text-muted-foreground">
              {preview.labels.length} 種類
            </span>
          </div>
          <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
            {preview.labels.map((label) => (
              <div
                key={label.name}
                className="flex items-center justify-between px-3 py-2"
              >
                <span className="text-sm">{label.name}</span>
                <span className="text-xs text-muted-foreground">
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
        />
      </div>
    </div>
  );

  const renderMappingStep = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        インポートするラベルを既存のラベルにマッピングできます。
        マッピングしない場合は新しいラベルが作成されます。
      </p>

      <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
        {preview?.labels.map((label) => (
          <div key={label.name} className="flex items-center gap-3 p-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{label.name}</div>
              <div className="text-xs text-muted-foreground">
                {label.count} 件
              </div>
            </div>
            <svg
              className="size-4 text-muted-foreground shrink-0"
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
            <select
              value={labelMapping[label.name] || ""}
              onChange={(e) =>
                setLabelMapping((prev) => ({
                  ...prev,
                  [label.name]: e.target.value,
                }))
              }
              className="w-40 rounded-md border bg-background px-3 py-1.5 text-sm"
            >
              <option value="">新規作成</option>
              {existingLabels.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-6">
      <div className="relative">
        <div className="size-16 rounded-full border-4 border-muted" />
        <div
          className="absolute inset-0 size-16 rounded-full border-4 border-primary border-t-transparent animate-spin"
          style={{ animationDuration: "1s" }}
        />
      </div>

      <div className="text-center space-y-2">
        <p className="text-sm font-medium">インポート中...</p>
        <p className="text-xs text-muted-foreground">
          {importProgress.toFixed(0)}% 完了
        </p>
      </div>

      <Progress value={importProgress} className="w-full max-w-xs h-2" />
    </div>
  );

  const renderCompleteStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-600">
        <svg
          className="size-8"
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

      <div className="text-center space-y-1">
        <p className="text-lg font-medium">インポート完了</p>
        <p className="text-sm text-muted-foreground">
          データセットが正常にインポートされました
        </p>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/20 text-destructive">
        <svg
          className="size-8"
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

      <div className="text-center space-y-1">
        <p className="text-lg font-medium">エラーが発生しました</p>
        <p className="text-sm text-muted-foreground">{error}</p>
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
          {getDescription() && (
            <DialogDescription>{getDescription()}</DialogDescription>
          )}
        </DialogHeader>

        {renderContent()}

        <DialogFooter>
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
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
