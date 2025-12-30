export interface Label {
  id: string;
  project_id: string;
  name: string;
  color: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface LabelCreate {
  name: string;
  color?: string;
  description?: string | null;
  sort_order?: number;
}

export interface LabelUpdate {
  name?: string;
  color?: string;
  description?: string | null;
  sort_order?: number;
}
