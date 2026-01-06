export type ImportFormat = "images_only" | "coco" | "yolo";
export type ImportStatus = "pending" | "processing" | "completed" | "failed";

export interface ImportJob {
  id: string;
  project_id: string;
  video_id: string | null;
  format: ImportFormat;
  status: ImportStatus;
  progress: number;
  s3_key: string | null;
  total_images: number | null;
  processed_images: number | null;
  total_annotations: number | null;
  imported_annotations: number | null;
  label_mapping: Record<string, string> | null;
  error_message: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ImportPreviewLabel {
  name: string;
  count: number;
}

export interface ImportPreviewResponse {
  format: ImportFormat;
  total_images: number;
  labels: ImportPreviewLabel[];
  sample_images: string[] | null;
}

export interface ImportUploadUrlRequest {
  format: ImportFormat;
  filename: string;
}

export interface ImportUploadUrlResponse {
  import_job_id: string;
  upload_url: string;
  s3_key: string;
}

export interface StartImportRequest {
  label_mapping?: Record<string, string> | null;
  name?: string | null;
}
