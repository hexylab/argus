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

// Image export item
export interface ImageExportItem {
  filename: string;
  url: string;
}

// Images export response
export interface ImagesExport {
  images: ImageExportItem[];
}

export async function exportCOCO(
  accessToken: string,
  projectId: string,
  reviewedOnly: boolean = false
): Promise<COCOExport> {
  const params = new URLSearchParams();
  if (reviewedOnly) {
    params.set("reviewed_only", "true");
  }
  const query = params.toString();
  const url = `/api/v1/projects/${projectId}/export/coco${query ? `?${query}` : ""}`;
  return apiClient<COCOExport>(url, {
    accessToken,
    method: "GET",
  });
}

export async function exportYOLO(
  accessToken: string,
  projectId: string,
  reviewedOnly: boolean = false
): Promise<YOLOExport> {
  const params = new URLSearchParams();
  if (reviewedOnly) {
    params.set("reviewed_only", "true");
  }
  const query = params.toString();
  const url = `/api/v1/projects/${projectId}/export/yolo${query ? `?${query}` : ""}`;
  return apiClient<YOLOExport>(url, {
    accessToken,
    method: "GET",
  });
}

export async function exportImages(
  accessToken: string,
  projectId: string
): Promise<ImagesExport> {
  return apiClient<ImagesExport>(
    `/api/v1/projects/${projectId}/export/images`,
    {
      accessToken,
      method: "GET",
    }
  );
}
