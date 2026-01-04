export interface SearchResultItem {
  frame_id: string;
  video_id: string;
  frame_number: number;
  similarity: number;
  s3_key: string;
  thumbnail_url: string | null;
}

export interface SearchResponse {
  results: SearchResultItem[];
  total: number;
  has_more: boolean;
}

export interface SearchRequest {
  query: string;
  video_id?: string;
  limit?: number;
  offset?: number;
  min_similarity?: number;
}
