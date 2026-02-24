// =============================================
// EXTRA REQUESTS - TYPES
// =============================================

export type ExtraRequestStatus = 'open' | 'in_progress' | 'done' | 'canceled';
export type ExtraRequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ExtraRequestedByRole = 'support' | 'social';
export type ExtraResponsibleRole = 'designer' | 'videomaker' | 'social' | 'support' | 'cs' | 'traffic';

export interface ExtraRequest {
  id: string;
  client_id: string;
  month_ref: string;
  title: string;
  request_rich: string | null;
  status: ExtraRequestStatus;
  priority: ExtraRequestPriority;
  requested_by_member_id: string | null;
  requested_by_role_key: ExtraRequestedByRole;
  responsible_role_key: ExtraResponsibleRole | null;
  assignee_id: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  format: string | null;
  updated_at: string;
  // Joined fields
  client_name?: string;
  requested_by_member_name?: string;
  assignee_name?: string;
}

export interface ExtraRequestFile {
  id: string;
  request_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  public_url: string | null;
  created_at: string;
}

// Constants
export const EXTRA_REQUEST_STATUS_LABELS: Record<ExtraRequestStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em Andamento',
  done: 'Concluída',
  canceled: 'Cancelada',
};

export const EXTRA_REQUEST_PRIORITY_LABELS: Record<ExtraRequestPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const EXTRA_REQUESTED_BY_ROLE_LABELS: Record<ExtraRequestedByRole, string> = {
  support: 'Atendimento',
  social: 'Social Media',
};

export const EXTRA_RESPONSIBLE_ROLE_LABELS: Record<ExtraResponsibleRole, string> = {
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  support: 'Atendimento',
  cs: 'CS',
  traffic: 'Tráfego',
};

// Map role key to account field for auto-assignment
export const ROLE_KEY_TO_ACCOUNT_FIELD: Record<ExtraResponsibleRole, string> = {
  designer: 'designer_member_id',
  videomaker: 'videomaker_member_id',
  social: 'social_member_id',
  support: 'support_member_id',
  cs: 'cs_member_id',
  traffic: 'traffic_member_id',
};
