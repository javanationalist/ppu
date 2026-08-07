export interface Category {
  id: string;
  name: string;
  icon: string;
  order?: number;
  type?: 'regular' | 'mpk_smaba';
}

export interface Dapil {
  id: string;
  category_id: string;
  name: string;
  eligible_classes: string[];
  photo_url?: string;
  order?: number;
}

export interface Candidate {
  id: string;
  category_id: string;
  number: number;
  chairman: string;
  vice?: string;
  visi: string;
  misi: string[];
  photo_url?: string;
  dapil_id?: string;
  candidate_class?: string;
  class_name?: string;
}
