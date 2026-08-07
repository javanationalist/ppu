export interface WafoAnnouncement {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  type?: string;
}
