export interface Vote {
  id?: string;
  voter_id: string;
  category_id: string;
  candidate_id: string;
  created_at?: string;
}
