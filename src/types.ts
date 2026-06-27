export type Role = 'user' | 'admin';
export type AccountStatus = 'belum_dikonfirmasi' | 'dikonfirmasi';
export type VotingStatus = 'belum' | 'sudah';

export interface Profile {
  id: string; // references auth.users.id
  full_name: string;
  email: string;
  role: Role;
  account_status: AccountStatus;
  voting_status: VotingStatus;
  class: string;
  card_id: string;
  created_at: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  card_visibility?: boolean;
}

export interface AuditLog {
  id?: string;
  admin_email: string;
  action: string;
  target_user?: string;
  created_at?: string;
}

export interface HelpdeskButton {
  id: string;
  label: string;
  url: string;
}

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

export interface WafoAnnouncement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Vote {
  id?: string;
  voter_id: string;
  category_id: string;
  candidate_id: string;
  created_at?: string;
}

export interface Countdown {
  id: string;
  name: string;
  title: string;
  target_datetime: string;
  finished_text: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}


