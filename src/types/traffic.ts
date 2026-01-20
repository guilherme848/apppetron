// Traffic Cycles
export interface TrafficCycle {
  id: string;
  name: string;
  cadence_days: number;
  description: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Cycle Task Templates
export interface TrafficCycleTask {
  id: string;
  cycle_id: string;
  title: string;
  details: string | null;
  default_priority: TrafficPriority;
  due_offset_days: number;
  task_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// Client Periods
export interface TrafficPeriod {
  id: string;
  client_id: string;
  cycle_id: string;
  period_start: string;
  period_end: string;
  status: TrafficPeriodStatus;
  created_at: string;
  updated_at: string;
}

// Generated Tasks
export interface TrafficTask {
  id: string;
  client_id: string;
  period_id: string;
  title: string;
  details: string | null;
  status: TrafficTaskStatus;
  priority: TrafficPriority;
  due_date: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export type TrafficPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TrafficPeriodStatus = 'active' | 'closed';
export type TrafficTaskStatus = 'todo' | 'doing' | 'done';

export const TRAFFIC_PRIORITY_OPTIONS: { value: TrafficPriority; label: string }[] = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

export const TRAFFIC_TASK_STATUS_OPTIONS: { value: TrafficTaskStatus; label: string }[] = [
  { value: 'todo', label: 'A Fazer' },
  { value: 'doing', label: 'Fazendo' },
  { value: 'done', label: 'Concluído' },
];

export const TRAFFIC_PERIOD_STATUS_OPTIONS: { value: TrafficPeriodStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'closed', label: 'Encerrado' },
];
