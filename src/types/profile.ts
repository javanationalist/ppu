export type Role = 'user' | 'admin' | 'creator' | 'vote' | 'bilik';
export type AccountStatus = 'belum_dikonfirmasi' | 'dikonfirmasi' | 'ditolak' | 'tidak_valid';
export type VotingStatus = 'belum' | 'sudah' | 'waiting' | 'connected' | 'voting' | 'offline';

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
  booth_code?: string;
}
