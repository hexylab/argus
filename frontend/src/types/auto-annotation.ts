export interface AutoAnnotateOptions {
  min_confidence: number;
}

export interface AutoAnnotateRequest {
  frame_ids: string[];
  label_id: string;
  options?: AutoAnnotateOptions;
}

export interface AutoAnnotateResponse {
  task_id: string;
  status: string;
  total_frames: number;
}

export interface TaskStatusResponse {
  task_id: string;
  status: "PENDING" | "STARTED" | "SUCCESS" | "FAILURE" | "RETRY";
  result?: {
    frame_count: number;
    annotation_count: number;
    failed_count: number;
    status: string;
  };
  error?: string;
}
