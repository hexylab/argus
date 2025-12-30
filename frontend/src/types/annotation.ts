export interface Annotation {
  id: string;
  frame_id: string;
  label_id: string;
  bbox_x: number; // normalized 0-1
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
  confidence: number | null;
  source: "manual" | "auto" | "imported";
  reviewed: boolean;
  created_at: string;
}

export interface AnnotationCreate {
  label_id: string;
  bbox_x: number;
  bbox_y: number;
  bbox_width: number;
  bbox_height: number;
}

// Canvas rendering (pixel coordinates)
export interface BoundingBoxData {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  labelId: string;
  labelName: string;
  labelColor: string;
}

// Drawing state
export interface DrawingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationMode = "pan" | "draw";
