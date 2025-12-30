"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { exportCOCOAction, exportYOLOAction } from "../actions";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type ExportFormat = "coco" | "yolo";

interface ExportFormProps {
  projectId: string;
  projectName: string;
}

export function ExportForm({ projectId, projectName }: ExportFormProps) {
  const [format, setFormat] = useState<ExportFormat>("coco");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);

    try {
      if (format === "coco") {
        const result = await exportCOCOAction(projectId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.data) {
          // Download as JSON file
          const blob = new Blob([JSON.stringify(result.data, null, 2)], {
            type: "application/json",
          });
          const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
          saveAs(blob, `${sanitizedName}_coco.json`);
          setSuccess("COCOフォーマットでエクスポートしました");
        }
      } else {
        const result = await exportYOLOAction(projectId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.data) {
          // Create ZIP file with data.yaml and annotations
          const zip = new JSZip();

          // Add data.yaml
          zip.file("data.yaml", result.data.data_yaml);

          // Add annotation files in labels folder
          const labelsFolder = zip.folder("labels");
          if (labelsFolder) {
            for (const [filename, content] of Object.entries(
              result.data.annotations
            )) {
              labelsFolder.file(filename, content);
            }
          }

          // Generate and download ZIP
          const blob = await zip.generateAsync({ type: "blob" });
          const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");
          saveAs(blob, `${sanitizedName}_yolo.zip`);
          setSuccess("YOLOフォーマットでエクスポートしました");
        }
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Format Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">エクスポート形式</h3>
        <RadioGroup
          value={format}
          onValueChange={(value) => setFormat(value as ExportFormat)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* COCO Format Card */}
          <Label
            htmlFor="coco"
            className={`
              relative flex flex-col p-6 rounded-xl border-2 cursor-pointer
              transition-all duration-200 hover:shadow-md
              ${
                format === "coco"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="coco" id="coco" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">COCO Format</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full">
                    JSON
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Microsoft COCO
                  形式。多くの機械学習フレームワークで標準的に使用されています。
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    annotations.json 形式
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    Detectron2, MMDetection 対応
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    カテゴリ情報含む
                  </li>
                </ul>
              </div>
            </div>
          </Label>

          {/* YOLO Format Card */}
          <Label
            htmlFor="yolo"
            className={`
              relative flex flex-col p-6 rounded-xl border-2 cursor-pointer
              transition-all duration-200 hover:shadow-md
              ${
                format === "yolo"
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-primary/50"
              }
            `}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem value="yolo" id="yolo" className="mt-1" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-lg">YOLO Format</span>
                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-full">
                    TXT
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ultralytics YOLO
                  形式。YOLOv5/v8などで直接使用できるフォーマットです。
                </p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    data.yaml + *.txt 形式
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    YOLOv5/v8 対応
                  </li>
                  <li className="flex items-center gap-2">
                    <svg
                      className="size-3.5 text-green-500"
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
                    ZIP アーカイブ
                  </li>
                </ul>
              </div>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {/* Error/Success Messages */}
      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <div className="flex items-center gap-2">
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
                d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
              />
            </svg>
            {error}
          </div>
        </div>
      ) : null}

      {success ? (
        <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4 text-green-600 dark:text-green-400">
          <div className="flex items-center gap-2">
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
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {success}
          </div>
        </div>
      ) : null}

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          disabled={isExporting}
          size="lg"
          className="gap-2 min-w-[160px]"
        >
          {isExporting ? (
            <>
              <svg
                className="size-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              エクスポート中...
            </>
          ) : (
            <>
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
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                />
              </svg>
              エクスポート実行
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
