 // Traffic Playbook System Types
 
 export type TrafficCadence = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
 export type TrafficAnchorRule = 'weekday' | 'biweekly_days' | 'month_day' | 'quarter_day';
 export type TrafficTaskStatus = 'todo' | 'doing' | 'blocked' | 'done' | 'skipped';
 export type TrafficCampaignStatus = 'active' | 'paused' | 'no_budget' | 'onboarding' | 'waiting_creatives';
 
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
 }
 
 export interface TrafficClientStatus {
   client_id: string;
   campaign_status: TrafficCampaignStatus;
   notes: string | null;
   updated_at: string;
   updated_by: string | null;
  weekly_workday: number; // 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday
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