// =============================================
// CUSTOMER SUCCESS - TYPES
// =============================================

// ============ Audit Log ============
export interface CsAuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  client_id: string | null;
  action: string;
  changed_by_member_id: string | null;
  changes_json: unknown;
  created_at: string;
}

// ============ Onboarding Flows (Templates) ============
export interface CsOnboardingFlow {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CsOnboardingFlowRule {
  id: string;
  flow_id: string;
  service_id: string | null;
  client_type: string | null;
  priority: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CsOnboardingFlowTask {
  id: string;
  flow_id: string;
  title: string;
  description_rich: string | null;
  required: boolean;
  default_due_days: number;
  default_responsible_role_key: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============ Client Onboarding ============
export type CsOnboardingStatus = 'not_started' | 'in_progress' | 'completed' | 'attention';
export type CsOnboardingTaskStatus = 'not_started' | 'in_progress' | 'done';

export interface CsClientOnboarding {
  id: string;
  client_id: string;
  flow_id: string;
  status: CsOnboardingStatus;
  started_at: string | null;
  completed_at: string | null;
  expected_end_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  flow_name?: string;
}

export interface CsClientOnboardingTask {
  id: string;
  client_onboarding_id: string;
  template_task_id: string | null;
  title: string;
  description_rich: string | null;
  status: CsOnboardingTaskStatus;
  required: boolean;
  due_at: string | null;
  completed_at: string | null;
  responsible_member_id: string | null;
  notes_rich: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  responsible_member_name?: string;
}

export interface CsOnboardingTaskFile {
  id: string;
  onboarding_task_id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string;
  created_at: string;
}

export interface CsOnboardingTaskHistory {
  id: string;
  onboarding_task_id: string;
  changed_by_member_id: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
  created_at: string;
  // Joined fields
  changed_by_member_name?: string;
}

// ============ Meetings ============
export type CsMeetingType = 'monthly_followup' | 'strategic' | 'alignment' | 'emergency';
export type CsMeetingStatus = 'scheduled' | 'done' | 'canceled' | 'rescheduled';
export type CsMeetingPerception = 'very_satisfied' | 'satisfied' | 'neutral' | 'dissatisfied';

export interface CsMeeting {
  id: string;
  client_id: string;
  meeting_date: string;
  type: CsMeetingType;
  responsible_member_id: string | null;
  status: CsMeetingStatus;
  objective_rich: string | null;
  decisions_rich: string | null;
  perception: CsMeetingPerception | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  responsible_member_name?: string;
}

export type CsMeetingActionStatus = 'todo' | 'doing' | 'done';

export interface CsMeetingAction {
  id: string;
  meeting_id: string;
  title: string;
  details_rich: string | null;
  due_at: string | null;
  assignee_member_id: string | null;
  status: CsMeetingActionStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee_member_name?: string;
}

// ============ NPS ============
export type CsNpsTriggerType = 'after_onboarding_30' | 'every_90' | 'before_renewal' | 'manual';
export type CsNpsClassification = 'promoter' | 'passive' | 'detractor';

export interface CsNpsSurvey {
  id: string;
  name: string;
  trigger_type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CsNpsTag {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export interface CsNpsResponse {
  id: string;
  client_id: string;
  survey_id: string | null;
  score: number;
  comment_rich: string | null;
  classification: CsNpsClassification;
  created_at: string;
  // Joined fields
  client_name?: string;
  survey_name?: string;
  tags?: CsNpsTag[];
}

// ============ Risk & Cancellation ============
export type CsRiskLevel = 'low' | 'moderate' | 'critical';
export type CsRiskReason = 'nps_detractor' | 'no_meetings' | 'negative_feedback' | 'pause_request' | 'delays' | 'manual';
export type CsRiskStatus = 'open' | 'in_progress' | 'resolved';
export type CsRiskActionStatus = 'todo' | 'doing' | 'done';

export interface CsRiskCase {
  id: string;
  client_id: string;
  level: CsRiskLevel;
  reason: CsRiskReason;
  details_rich: string | null;
  status: CsRiskStatus;
  owner_member_id: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client_name?: string;
  owner_member_name?: string;
}

export interface CsRiskActionItem {
  id: string;
  risk_case_id: string;
  title: string;
  details_rich: string | null;
  assignee_member_id: string | null;
  due_at: string | null;
  status: CsRiskActionStatus;
  created_at: string;
  updated_at: string;
  // Joined fields
  assignee_member_name?: string;
}

export interface CsCancellation {
  id: string;
  client_id: string;
  effective_cancel_date: string;
  retention_attempted: boolean;
  offer_applied: string | null;
  notes_rich: string | null;
  created_at: string;
  // Joined fields
  client_name?: string;
  reasons?: CsCancellationReason[];
}

export interface CsCancellationReason {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

// ============ Settings ============
export interface CsSetting {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

// ============ Dashboard Metrics ============
export interface CsDashboardMetrics {
  activeClients: number;
  clientsInOnboarding: number;
  clientsAtRisk: number;
  cancellationsThisMonth: number;
  churnRate: number;
  averageNps: number;
  avgOnboardingDays: number;
}

export interface CsAlert {
  type: 'onboarding_delayed' | 'no_meeting' | 'detractor_no_followup' | 'renewal_soon';
  clientId: string;
  clientName: string;
  details: string;
  daysOverdue?: number;
}

// ============ Constants ============
export const CS_MEETING_TYPE_LABELS: Record<CsMeetingType, string> = {
  monthly_followup: 'Acompanhamento Mensal',
  strategic: 'Estratégica',
  alignment: 'Alinhamento',
  emergency: 'Emergência',
};

export const CS_MEETING_STATUS_LABELS: Record<CsMeetingStatus, string> = {
  scheduled: 'Agendada',
  done: 'Realizada',
  canceled: 'Cancelada',
  rescheduled: 'Reagendada',
};

export const CS_MEETING_PERCEPTION_LABELS: Record<CsMeetingPerception, string> = {
  very_satisfied: 'Muito Satisfeito',
  satisfied: 'Satisfeito',
  neutral: 'Neutro',
  dissatisfied: 'Insatisfeito',
};

export const CS_ONBOARDING_STATUS_LABELS: Record<CsOnboardingStatus, string> = {
  not_started: 'Não Iniciado',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
  attention: 'Atenção',
};

export const CS_TASK_STATUS_LABELS: Record<CsOnboardingTaskStatus, string> = {
  not_started: 'A Fazer',
  in_progress: 'Em Progresso',
  done: 'Concluído',
};

export const CS_RISK_LEVEL_LABELS: Record<CsRiskLevel, string> = {
  low: 'Baixo',
  moderate: 'Moderado',
  critical: 'Crítico',
};

export const CS_RISK_REASON_LABELS: Record<CsRiskReason, string> = {
  nps_detractor: 'NPS Detrator',
  no_meetings: 'Sem Reuniões',
  negative_feedback: 'Feedback Negativo',
  pause_request: 'Pedido de Pausa',
  delays: 'Atrasos',
  manual: 'Manual',
};

export const CS_RISK_STATUS_LABELS: Record<CsRiskStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
};

export const CS_NPS_CLASSIFICATION_LABELS: Record<CsNpsClassification, string> = {
  promoter: 'Promotor',
  passive: 'Neutro',
  detractor: 'Detrator',
};

export const RESPONSIBLE_ROLE_KEYS = [
  { key: 'cs', label: 'CS', accountField: 'cs_member_id' },
  { key: 'social', label: 'Social Media', accountField: 'social_member_id' },
  { key: 'traffic', label: 'Tráfego', accountField: 'traffic_member_id' },
  { key: 'support', label: 'Suporte', accountField: 'support_member_id' },
  { key: 'designer', label: 'Designer', accountField: 'designer_member_id' },
  { key: 'videomaker', label: 'Videomaker', accountField: 'videomaker_member_id' },
] as const;
