export type VideoStatus = "uploading" | "processing" | "ready" | "failed";
export type VideoSourceType = "video" | "image_set";

export interface VideoMetadata {
  codec?: string | null;
  bitrate?: number | null;
  [key: string]: unknown;
}

export interface Video {
  id: string;
  project_id: string;
  filename: string;
  original_filename: string;
  s3_key: string;
  mime_type: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  frame_count: number | null;
  status: VideoStatus;
  error_message: string | null;
  metadata: VideoMetadata;
  created_at: string;
  thumbnail_url: string | null;
  source_type: VideoSourceType;
}

export interface UploadUrlRequest {
  filename: string;
  mime_type?: string | null;
}

export interface UploadUrlResponse {
  video_id: string;
  upload_url: string;
  s3_key: string;
  expires_in: number;
}

export interface UploadCompleteRequest {
  file_size?: number | null;
}

export interface VideoListParams {
  skip?: number;
  limit?: number;
}

export interface CheckFilenameRequest {
  filename: string;
}

export interface CheckFilenameResponse {
  exists: boolean;
  existing_video: Video | null;
}
