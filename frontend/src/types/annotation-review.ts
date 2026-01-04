export interface AnnotationWithFrame {
  id: string;
  frame_id: string;
  label_id: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: number | null;
  source: "manual" | "auto" | "imported";
  reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_by: string;
  created_at: string;
  // Frame info
  frame_number: number;
  frame_s3_key: string;
  frame_thumbnail_s3_key: string | null;
  video_id: string;
  // Label info
  label_name: string;
  label_color: string;
}

export interface AnnotationReviewStats {
  total_count: number;
  reviewed_count: number;
  pending_count: number;
  auto_count: number;
  manual_count: number;
}

export interface BulkApproveRequest {
  annotation_ids: string[];
}

export interface BulkApproveResponse {
  approved_count: number;
  errors: string[];
}

export interface BulkDeleteRequest {
  annotation_ids: string[];
}

export interface BulkDeleteResponse {
  deleted_count: number;
  errors: string[];
}

export interface AnnotationFilterParams {
  source?: "manual" | "auto" | "imported";
  reviewed?: boolean;
  min_confidence?: number;
  max_confidence?: number;
  label_id?: string;
  video_id?: string;
  skip?: number;
  limit?: number;
}
