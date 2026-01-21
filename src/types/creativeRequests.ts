// =============================================
// CREATIVE REQUESTS - TYPES
// =============================================

export type CreativeRequestStatus = 'open' | 'in_progress' | 'ready_for_review' | 'approved' | 'done' | 'canceled';
export type CreativeRequestPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CreativeRequestFormat = 'static' | 'video' | 'carousel' | 'story' | 'reels' | 'other';
export type CreativeRequestObjective = 'awareness' | 'leads' | 'sales' | 'remarketing' | 'other';
export type CreativeRequestedByRole = 'traffic';
export type CreativeResponsibleRole = 'designer' | 'videomaker' | 'social' | 'support' | 'cs' | 'traffic';

export interface CreativeRequest {
  id: string;
  client_id: string;
  month_ref: string;
  title: string;
  brief_title: string | null;
  brief_rich: string | null;
  format: CreativeRequestFormat;
  objective: CreativeRequestObjective | null;
  priority: CreativeRequestPriority;
  status: CreativeRequestStatus;
  due_date: string | null;
  requested_by_member_id: string | null;
  requested_by_role_key: CreativeRequestedByRole;
  responsible_role_key: CreativeResponsibleRole | null;
  assignee_id: string | null;
  reviewer_member_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  requested_by_member_name?: string;
  assignee_name?: string;
  reviewer_name?: string;
}

export interface CreativeRequestFile {
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
export const CREATIVE_REQUEST_STATUS_LABELS: Record<CreativeRequestStatus, string> = {
  open: 'Aberta',
  in_progress: 'Em Produção',
  ready_for_review: 'Aguardando Revisão',
  approved: 'Aprovado',
  done: 'Concluída',
  canceled: 'Cancelada',
};

export const CREATIVE_REQUEST_STATUS_OPTIONS: { value: CreativeRequestStatus; label: string }[] = [
  { value: 'open', label: 'Aberta' },
  { value: 'in_progress', label: 'Em Produção' },
  { value: 'ready_for_review', label: 'Aguardando Revisão' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'done', label: 'Concluída' },
  { value: 'canceled', label: 'Cancelada' },
];

export const CREATIVE_REQUEST_PRIORITY_LABELS: Record<CreativeRequestPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const CREATIVE_REQUEST_PRIORITY_OPTIONS: { value: CreativeRequestPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export const CREATIVE_REQUEST_FORMAT_LABELS: Record<CreativeRequestFormat, string> = {
  static: 'Estático',
  video: 'Vídeo',
  carousel: 'Carrossel',
  story: 'Story',
  reels: 'Reels',
  other: 'Outro',
};

export const CREATIVE_REQUEST_FORMAT_OPTIONS: { value: CreativeRequestFormat; label: string }[] = [
  { value: 'static', label: 'Estático' },
  { value: 'video', label: 'Vídeo' },
  { value: 'carousel', label: 'Carrossel' },
  { value: 'story', label: 'Story' },
  { value: 'reels', label: 'Reels' },
  { value: 'other', label: 'Outro' },
];

export const CREATIVE_REQUEST_OBJECTIVE_LABELS: Record<CreativeRequestObjective, string> = {
  awareness: 'Reconhecimento',
  leads: 'Leads',
  sales: 'Vendas',
  remarketing: 'Remarketing',
  other: 'Outro',
};

export const CREATIVE_REQUEST_OBJECTIVE_OPTIONS: { value: CreativeRequestObjective; label: string }[] = [
  { value: 'awareness', label: 'Reconhecimento' },
  { value: 'leads', label: 'Leads' },
  { value: 'sales', label: 'Vendas' },
  { value: 'remarketing', label: 'Remarketing' },
  { value: 'other', label: 'Outro' },
];

export const CREATIVE_RESPONSIBLE_ROLE_LABELS: Record<CreativeResponsibleRole, string> = {
  designer: 'Designer',
  videomaker: 'Videomaker',
  social: 'Social Media',
  support: 'Atendimento',
  cs: 'CS',
  traffic: 'Tráfego',
};

export const CREATIVE_RESPONSIBLE_ROLE_OPTIONS: { value: CreativeResponsibleRole; label: string }[] = [
  { value: 'designer', label: 'Designer' },
  { value: 'videomaker', label: 'Videomaker' },
  { value: 'social', label: 'Social Media' },
  { value: 'support', label: 'Atendimento' },
  { value: 'cs', label: 'CS' },
  { value: 'traffic', label: 'Tráfego' },
];

// Map role key to account field for auto-assignment
export const CREATIVE_ROLE_KEY_TO_ACCOUNT_FIELD: Record<CreativeResponsibleRole, string> = {
  designer: 'designer_member_id',
  videomaker: 'videomaker_member_id',
  social: 'social_member_id',
  support: 'support_member_id',
  cs: 'cs_member_id',
  traffic: 'traffic_member_id',
};
