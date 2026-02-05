 // Traffic Playbook System Types
 
 export type TrafficCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
 export type TrafficAnchorRule = 'weekday' | 'biweekly_days' | 'month_day' | 'quarter_day';
 export type TrafficTaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'skipped';
 export type TrafficCampaignStatus = 'active' | 'paused' | 'no_budget' | 'onboarding' | 'waiting_creatives';
export type TrafficBlockedReason = 'waiting_creatives' | 'waiting_approval' | 'no_budget' | 'access_issue' | 'billing_issue' | 'other';
 
export interface ChecklistItem {
  id: string;
  text: string;
  checked?: boolean;
}

// JSON-compatible type for database operations
export type ChecklistJson = Record<string, unknown>[];

export interface TrafficPlaybookTemplate {
   id: string;
   service_id: string;
   name: string;
   description: string | null;
  checklist: ChecklistJson;
   cadence: TrafficCadence;
   anchor_rule: TrafficAnchorRule | null;
   anchor_day_of_week: number | null;
   anchor_day_of_month: number | null;
   offset_days: number;
   default_owner_role: string;
   priority: 'low' | 'medium' | 'high';
   sort_order: number;
   active: boolean;
   created_at: string;
   updated_at: string;
 }
 
 export interface TrafficPlaybookOverride {
   id: string;
   client_id: string;
   template_id: string;
   is_disabled: boolean;
   owner_override: string | null;
   cadence_override: TrafficCadence | null;
   notes_override: string | null;
   created_at: string;
   updated_at: string;
 }
 
 export interface TrafficPlaybookTask {
   id: string;
   client_id: string;
   template_id: string | null;
   period_start: string;
   period_end: string | null;
   title: string;
   description: string | null;
  checklist: ChecklistJson;
   status: TrafficTaskStatus;
   priority: 'low' | 'medium' | 'high';
   cadence: TrafficCadence | null;
   due_date: string;
   assigned_to: string | null;
  evidence_links: ChecklistJson;
   notes: string | null;
   created_at: string;
   updated_at: string;
   completed_at: string | null;
  blocked_reason: TrafficBlockedReason | null;
  blocked_at: string | null;
 }
 
 export interface TrafficClientStatus {
   client_id: string;
   campaign_status: TrafficCampaignStatus;
   notes: string | null;
   updated_at: string;
   updated_by: string | null;
  weekly_workday: number; // 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
  weekly_workday_locked: boolean;
  weekly_assigned_at: string | null;
 }
 
 // UI Constants
 export const CADENCE_OPTIONS: { value: TrafficCadence; label: string; description: string }[] = [
   { value: 'daily', label: 'Diária', description: 'Todos os dias' },
   { value: 'weekly', label: 'Semanal', description: 'Uma vez por semana' },
   { value: 'biweekly', label: 'Quinzenal', description: 'A cada 15 dias' },
   { value: 'monthly', label: 'Mensal', description: 'Uma vez por mês' },
   { value: 'quarterly', label: 'Trimestral', description: 'Uma vez por trimestre' },
 ];
 
 export const CAMPAIGN_STATUS_OPTIONS: { value: TrafficCampaignStatus; label: string; color: string }[] = [
   { value: 'active', label: 'Ativo', color: 'bg-green-100 text-green-800' },
   { value: 'paused', label: 'Pausado', color: 'bg-yellow-100 text-yellow-800' },
   { value: 'no_budget', label: 'Sem verba', color: 'bg-red-100 text-red-800' },
   { value: 'onboarding', label: 'Onboarding', color: 'bg-blue-100 text-blue-800' },
   { value: 'waiting_creatives', label: 'Aguardando criativos', color: 'bg-purple-100 text-purple-800' },
 ];
 
 export const PRIORITY_OPTIONS: { value: string; label: string; color: string }[] = [
   { value: 'low', label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
   { value: 'medium', label: 'Média', color: 'bg-blue-100 text-blue-800' },
   { value: 'high', label: 'Alta', color: 'bg-red-100 text-red-800' },
 ];
 
 export const TASK_STATUS_OPTIONS: { value: TrafficTaskStatus; label: string; color: string }[] = [
   { value: 'todo', label: 'A fazer', color: 'bg-gray-100 text-gray-800' },
   { value: 'doing', label: 'Fazendo', color: 'bg-blue-100 text-blue-800' },
   { value: 'blocked', label: 'Bloqueado', color: 'bg-red-100 text-red-800' },
   { value: 'done', label: 'Concluído', color: 'bg-green-100 text-green-800' },
   { value: 'skipped', label: 'Ignorado', color: 'bg-yellow-100 text-yellow-800' },
 ];
 
export const BLOCKED_REASON_OPTIONS: { value: TrafficBlockedReason; label: string }[] = [
  { value: 'waiting_creatives', label: 'Aguardando Criativos' },
  { value: 'waiting_approval', label: 'Aguardando Aprovação' },
  { value: 'no_budget', label: 'Sem Verba' },
  { value: 'access_issue', label: 'Problema de Acesso' },
  { value: 'billing_issue', label: 'Problema de Faturamento' },
  { value: 'other', label: 'Outro' },
];

export const WORKLOAD_WEIGHTS: Record<TrafficCadence, number> = {
  daily: 1,
  weekly: 2,
  biweekly: 3,
  monthly: 5,
  quarterly: 8,
};

export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'next7', label: 'Próximos 7 dias' },
  { value: 'next14', label: 'Próximos 14 dias' },
  { value: 'month', label: 'Este Mês' },
];

 export const WEEKDAY_OPTIONS = [
   { value: 1, label: 'Segunda-feira' },
   { value: 2, label: 'Terça-feira' },
   { value: 3, label: 'Quarta-feira' },
   { value: 4, label: 'Quinta-feira' },
   { value: 5, label: 'Sexta-feira' },
 ];

export const WORKDAY_OPTIONS = [
  { value: 1, label: 'Segunda', short: 'Seg' },
  { value: 2, label: 'Terça', short: 'Ter' },
  { value: 3, label: 'Quarta', short: 'Qua' },
  { value: 4, label: 'Quinta', short: 'Qui' },
  { value: 5, label: 'Sexta', short: 'Sex' },
];

export interface WeeklyLoadByDay {
  weekday: number;
  total_load: number;
  client_count: number;
}

export interface RebalanceLogEntry {
  id: string;
  client_id: string;
  old_workday: number;
  new_workday: number;
  reason: string | null;
  moved_by: string | null;
  moved_at: string;
}

export interface RebalanceParams {
  max_moves: number;
  cooldown_days: number;
  threshold_percent: number;
  dry_run?: boolean;
}

export interface RebalanceResult {
  success: boolean;
  moves: {
    client_id: string;
    client_name: string;
    old_workday: number;
    new_workday: number;
    reason: string;
  }[];
  load_before: Record<number, { load: number; clients: number }>;
  load_after: Record<number, { load: number; clients: number }>;
  skipped_reason?: string;
  error?: string;
}