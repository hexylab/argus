import { apiClient } from "./client";

// COCO format response
export interface COCOExport {
  info: {
    description: string;
    url: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string;
  };
  licenses: unknown[];
  images: {
    id: number;
    file_name: string;
    width: number;
    height: number;
  }[];
  annotations: {
    id: number;
    image_id: number;
    category_id: number;
    bbox: [number, number, number, number];
    area: number;
    iscrowd: number;
    segmentation: number[][];
  }[];
  categories: {
    id: number;
    name: string;
    supercategory: string;
  }[];
}

// YOLO format response
export interface YOLOExport {
  data_yaml: string;
  annotations: Record<string, string>;
}

export async function exportCOCO(
  accessToken: string,
  projectId: string
): Promise<COCOExport> {
  return apiClient<COCOExport>(`/api/v1/projects/${projectId}/export/coco`, {
    accessToken,
    method: "GET",
  });
}

export async function exportYOLO(
  accessToken: string,
  projectId: string
): Promise<YOLOExport> {
  return apiClient<YOLOExport>(`/api/v1/projects/${projectId}/export/yolo`, {
    accessToken,
    method: "GET",
  });
}
