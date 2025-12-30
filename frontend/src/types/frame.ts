export interface Frame {
  id: string;
  video_id: string;
  frame_number: number;
  timestamp_ms: number;
  s3_key: string;
  thumbnail_s3_key: string | null;
  thumbnail_url: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface FrameDetail extends Frame {
  image_url: string;
}

export interface FrameListParams {
  skip?: number;
  limit?: number;
}
