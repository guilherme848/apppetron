export interface SalesFunnel {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
}

export interface SalesFunnelStage {
  id: string;
  funnel_id: string;
  name: string;
  color: string;
  sort_order: number;
  probability: number;
  created_at: string;
}

export interface SalesDeal {
  id: string;
  funnel_id: string;
  stage_id: string;
  contact_id: string | null;
  title: string;
  value: number;
  probability: number;
  responsible_id: string | null;
  tags: string[];
  notes: string | null;
  status: 'open' | 'won' | 'lost';
  closed_at: string | null;
  created_at: string;
  // Joined data
  contact?: SalesContact | null;
  responsible?: { id: string; name: string; avatar_url?: string | null } | null;
  stage?: SalesFunnelStage | null;
  funnel?: SalesFunnel | null;
}

export interface SalesDealStageHistory {
  id: string;
  deal_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  user_id: string | null;
  changed_at: string;
}

export interface SalesContact {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  origin: string | null;
  tags: string[];
  notes: string | null;
  created_at: string;
}

export interface SalesActivity {
  id: string;
  deal_id: string | null;
  contact_id: string | null;
  cadence_id: string | null;
  type: 'call' | 'whatsapp' | 'email' | 'meeting' | 'task';
  title: string;
  description: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  result: string | null;
  notes: string | null;
  responsible_id: string | null;
  status: 'pending' | 'completed' | 'canceled';
  created_at: string;
  // Joined
  deal?: SalesDeal | null;
  contact?: SalesContact | null;
  responsible?: { id: string; name: string } | null;
}

export interface SalesCadence {
  id: string;
  name: string;
  funnel_id: string | null;
  trigger_stage_id: string | null;
  created_at: string;
}

export interface SalesCadenceStep {
  id: string;
  cadence_id: string;
  day_offset: number;
  type: string;
  title: string;
  description: string | null;
  responsible_type: string;
  sort_order: number;
  created_at: string;
}

export interface SalesCall {
  id: string;
  contact_id: string | null;
  deal_id: string | null;
  user_id: string | null;
  phone: string | null;
  duration: number;
  result: string | null;
  notes: string | null;
  api4com_call_id: string | null;
  created_at: string;
}

export const ACTIVITY_TYPE_COLORS: Record<string, string> = {
  call: '#F4762D',
  whatsapp: '#0F766E',
  email: '#1B2B3B',
  meeting: '#92400E',
  task: '#64748B',
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  call: 'Ligação',
  whatsapp: 'WhatsApp',
  email: 'E-mail',
  meeting: 'Reunião',
  task: 'Tarefa',
};

export const DEAL_RESULT_OPTIONS = [
  { value: 'answered', label: 'Atendeu' },
  { value: 'not_answered', label: 'Não Atendeu' },
  { value: 'rescheduled', label: 'Reagendado' },
  { value: 'no_interest', label: 'Sem Interesse' },
  { value: 'converted', label: 'Convertido' },
];
