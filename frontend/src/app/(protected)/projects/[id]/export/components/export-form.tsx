"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  exportCOCOAction,
  exportYOLOAction,
  exportImagesAction,
} from "../actions";
import JSZip from "jszip";
import { saveAs } from "file-saver";

type ExportFormat = "coco" | "yolo";

interface ExportFormProps {
  projectId: string;
  projectName: string;
}

// Format card icons
function COCOIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect
        x="2"
        y="4"
        width="28"
        height="24"
        rx="2"
        className="stroke-current"
        strokeWidth="2"
      />
      <path
        d="M2 10h28M10 10v18M22 10v18"
        className="stroke-current"
        strokeWidth="2"
      />
      <circle cx="6" cy="7" r="1.5" className="fill-current" />
      <circle cx="10" cy="7" r="1.5" className="fill-current" />
      <circle cx="14" cy="7" r="1.5" className="fill-current" />
    </svg>
  );
}

function YOLOIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none">
      <rect
        x="4"
        y="4"
        width="24"
        height="24"
        rx="2"
        className="stroke-current"
        strokeWidth="2"
      />
      <rect
        x="8"
        y="10"
        width="10"
        height="8"
        rx="1"
        className="stroke-current"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle
        cx="22"
        cy="22"
        r="4"
        className="stroke-current"
        strokeWidth="2"
      />
      <path d="M22 20v4M20 22h4" className="stroke-current" strokeWidth="1.5" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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
  );
}

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
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
  );
}

function ImageIcon({ className }: { className?: string }) {
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
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  );
}

export function ExportForm({ projectId, projectName }: ExportFormProps) {
  const [format, setFormat] = useState<ExportFormat>("coco");
  const [includeImages, setIncludeImages] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const downloadImages = async (
    zip: JSZip,
    imagesFolder: JSZip
  ): Promise<void> => {
    setProgress("画像情報を取得中...");
    setProgressPercent(10);
    const imagesResult = await exportImagesAction(projectId);

    if (imagesResult.error) {
      throw new Error(imagesResult.error);
    }

    if (!imagesResult.data || imagesResult.data.images.length === 0) {
      return;
    }

    const images = imagesResult.data.images;
    const total = images.length;

    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const percent = Math.round(10 + (i / total) * 80);
      setProgress(`画像をダウンロード中... (${i + 1}/${total})`);
      setProgressPercent(percent);

      try {
        const response = await fetch(image.url);
        if (!response.ok) {
          console.warn(`Failed to fetch image: ${image.filename}`);
          continue;
        }
        const blob = await response.blob();
        imagesFolder.file(image.filename, blob);
      } catch (err) {
        console.warn(`Failed to download image: ${image.filename}`, err);
      }
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(null);
    setProgress(null);
    setProgressPercent(0);

    try {
      const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, "_");

      if (format === "coco") {
        setProgress("COCOデータを取得中...");
        setProgressPercent(5);
        const result = await exportCOCOAction(projectId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.data) {
          if (includeImages) {
            const zip = new JSZip();
            zip.file("annotations.json", JSON.stringify(result.data, null, 2));

            const imagesFolder = zip.folder("images");
            if (imagesFolder) {
              await downloadImages(zip, imagesFolder);
            }

            setProgress("ZIPファイルを生成中...");
            setProgressPercent(95);
            const blob = await zip.generateAsync({ type: "blob" });
            saveAs(blob, `${sanitizedName}_coco.zip`);
          } else {
            const blob = new Blob([JSON.stringify(result.data, null, 2)], {
              type: "application/json",
            });
            saveAs(blob, `${sanitizedName}_coco.json`);
          }
          setProgressPercent(100);
          setSuccess("COCOフォーマットでエクスポートしました");
        }
      } else {
        setProgress("YOLOデータを取得中...");
        setProgressPercent(5);
        const result = await exportYOLOAction(projectId);

        if (result.error) {
          setError(result.error);
          return;
        }

        if (result.data) {
          const zip = new JSZip();
          zip.file("data.yaml", result.data.data_yaml);

          const labelsFolder = zip.folder("labels");
          if (labelsFolder) {
            for (const [filename, content] of Object.entries(
              result.data.annotations
            )) {
              labelsFolder.file(filename, content);
            }
          }

          if (includeImages) {
            const imagesFolder = zip.folder("images");
            if (imagesFolder) {
              await downloadImages(zip, imagesFolder);
            }
          }

          setProgress("ZIPファイルを生成中...");
          setProgressPercent(95);
          const blob = await zip.generateAsync({ type: "blob" });
          saveAs(blob, `${sanitizedName}_yolo.zip`);
          setProgressPercent(100);
          setSuccess("YOLOフォーマットでエクスポートしました");
        }
      }
    } catch (err) {
      console.error("Export error:", err);
      setError("エクスポート中にエラーが発生しました");
    } finally {
      setIsExporting(false);
      setProgress(null);
      setProgressPercent(0);
    }
  };

  const formatOptions = [
    {
      id: "coco" as const,
      name: "COCO Format",
      description:
        "Microsoft COCO 形式。Detectron2、MMDetection など多くのフレームワークで標準的に使用されています。",
      badge: "JSON",
      badgeColor: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
      icon: COCOIcon,
      features: [
        "annotations.json 形式",
        "Detectron2 / MMDetection",
        "カテゴリ情報",
      ],
    },
    {
      id: "yolo" as const,
      name: "YOLO Format",
      description:
        "Ultralytics YOLO 形式。YOLOv5/v8/v11 などで直接使用できるフォーマットです。",
      badge: "TXT",
      badgeColor: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
      icon: YOLOIcon,
      features: ["data.yaml + *.txt", "YOLOv5 / v8 / v11", "ZIP アーカイブ"],
    },
  ];

  return (
    <div className="space-y-10">
      {/* Format Selection */}
      <section>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">
            エクスポート形式
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            データの出力形式を選択してください
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {formatOptions.map((option) => {
            const isSelected = format === option.id;
            const Icon = option.icon;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFormat(option.id)}
                className={`
                  group relative flex flex-col rounded-2xl border-2 p-6 text-left
                  transition-all duration-200 ease-out
                  hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
                  ${
                    isSelected
                      ? "border-foreground bg-foreground/[0.03] shadow-md shadow-black/5 dark:shadow-black/20"
                      : "border-border hover:border-foreground/30"
                  }
                `}
              >
                {/* Selected indicator */}
                <div
                  className={`
                    absolute right-4 top-4 flex size-6 items-center justify-center rounded-full
                    transition-all duration-200
                    ${
                      isSelected
                        ? "bg-foreground text-background"
                        : "border-2 border-border bg-transparent group-hover:border-foreground/30"
                    }
                  `}
                >
                  {isSelected ? <CheckIcon className="size-3.5" /> : null}
                </div>

                {/* Icon and header */}
                <div className="flex items-start gap-4">
                  <div
                    className={`
                      flex size-12 shrink-0 items-center justify-center rounded-xl
                      transition-colors duration-200
                      ${
                        isSelected
                          ? "bg-foreground/10"
                          : "bg-muted group-hover:bg-foreground/5"
                      }
                    `}
                  >
                    <Icon
                      className={`size-6 transition-colors ${isSelected ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/70"}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-foreground">
                        {option.name}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${option.badgeColor}`}
                      >
                        {option.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {option.description}
                </p>

                {/* Features list */}
                <ul className="mt-4 space-y-2">
                  {option.features.map((feature, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {/* Options */}
      <section>
        <div className="mb-5">
          <h3 className="text-base font-semibold text-foreground">
            オプション
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            追加のエクスポートオプションを設定
          </p>
        </div>

        <div
          className={`
            rounded-2xl border-2 p-5 transition-all duration-200
            ${includeImages ? "border-foreground/20 bg-foreground/[0.02]" : "border-border"}
          `}
        >
          <Label
            htmlFor="include-images"
            className="flex cursor-pointer items-start gap-4"
          >
            <div className="pt-0.5">
              <Checkbox
                id="include-images"
                checked={includeImages}
                onCheckedChange={(checked: boolean) =>
                  setIncludeImages(checked)
                }
                className="size-5"
              />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center gap-2.5">
                <ImageIcon className="size-5 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  画像を含める
                </span>
                <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  ZIP
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                アノテーションデータと一緒にフレーム画像もダウンロードします。
                画像数が多い場合は時間がかかる場合があります。
              </p>
            </div>
          </Label>
        </div>
      </section>

      {/* Status Messages */}
      {progress !== null || error !== null || success !== null ? (
        <section className="space-y-4">
          {/* Progress */}
          {progress !== null ? (
            <div className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/50">
              <div className="flex items-center gap-3 px-5 py-4">
                <SpinnerIcon className="size-5 animate-spin text-sky-600 dark:text-sky-400" />
                <span className="text-sm font-medium text-sky-700 dark:text-sky-300">
                  {progress}
                </span>
              </div>
              <Progress
                value={progressPercent}
                className="h-1 rounded-none bg-sky-100 dark:bg-sky-900"
              />
            </div>
          ) : null}

          {/* Error */}
          {error !== null ? (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/50">
              <svg
                className="size-5 shrink-0 text-red-600 dark:text-red-400"
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
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {error}
              </span>
            </div>
          ) : null}

          {/* Success */}
          {success !== null ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 dark:border-emerald-900 dark:bg-emerald-950/50">
              <svg
                className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
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
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                {success}
              </span>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Export Button */}
      <section className="flex items-center justify-between border-t border-border pt-8">
        <div className="text-sm text-muted-foreground">
          {includeImages ? (
            <span>画像を含むZIPファイルをダウンロード</span>
          ) : format === "coco" ? (
            <span>JSONファイルをダウンロード</span>
          ) : (
            <span>ZIPファイルをダウンロード</span>
          )}
        </div>

        <Button
          onClick={handleExport}
          disabled={isExporting}
          size="lg"
          className="gap-2.5 px-6 font-semibold"
        >
          {isExporting ? (
            <>
              <SpinnerIcon className="size-4 animate-spin" />
              エクスポート中...
            </>
          ) : (
            <>
              <DownloadIcon className="size-4" />
              エクスポート実行
            </>
          )}
        </Button>
      </section>
    </div>
  );
}
