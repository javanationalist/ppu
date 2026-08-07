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
