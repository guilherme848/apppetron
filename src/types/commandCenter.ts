// =============================================
// CS COMMAND CENTER - TYPES
// =============================================

export type MetricMode = 'clients' | 'mrr';
export type PeriodFilter = '7d' | '30d' | '90d' | '180d' | 'custom';
export type ClientStatus = 'active' | 'onboarding' | 'at_risk' | 'churned' | 'all';
export type HealthStatus = 'healthy' | 'attention' | 'critical';

export interface CommandCenterFilters {
  period: PeriodFilter;
  customStartDate?: Date;
  customEndDate?: Date;
  csOwnerId: string | null;
  status: ClientStatus;
  nicheId: string | null;
  serviceId: string | null;
  state: string | null;
  city: string | null;
  origin: string | null;
  churnReason: string | null;
  metricMode: MetricMode;
}

export interface KPIData {
  activeClients: number;
  activeClientsDelta: number;
  onboardingClients: number;
  onboardingOnTime: number;
  atRiskClients: number;
  atRiskDelta: number;
  avgNps: number;
  npsDelta: number;
  churnCount: number;
  churnMrr: number;
  churnDelta: number;
  avgOnboardingDays: number;
  avgTimeToChurn: number;
}

export interface OnboardingFunnel {
  created: number;
  inProgress: number;
  completed: number;
  onTime: number;
  delayed: number;
}

export interface Alert {
  id: string;
  type: 'detractor_no_contact' | 'onboarding_stalled' | 'critical_no_playbook' | 'meeting_overdue' | 'task_sla_breached';
  clientId: string;
  clientName: string;
  details: string;
  severity: 'high' | 'medium' | 'low';
  createdAt: string;
}

export interface HealthDistribution {
  healthy: number;
  attention: number;
  critical: number;
}

export interface NpsDistribution {
  promoters: number;
  passives: number;
  detractors: number;
  avgScore: number;
}

export interface ChurnByDimension {
  id: string;
  name: string;
  churnCount: number;
  churnMrr: number;
  churnRate: number;
  totalClients: number;
}

export interface ChurnEvent {
  id: string;
  clientId: string;
  clientName: string;
  cancelDate: string;
  reason: string;
  subReason?: string;
  mrrLost: number;
  lifetimeDays: number;
  retentionAttempted: boolean;
  retentionResult?: string;
  ownerName?: string;
  previousNps?: number;
  nicheName?: string;
  serviceName?: string;
  state?: string;
}

export interface Playbook {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  status: 'active' | 'completed' | 'cancelled';
  responsibleName?: string;
  dueAt?: string;
  progress: number;
  tasksDone: number;
  tasksTotal: number;
}

export interface ClientListItem {
  id: string;
  name: string;
  status: string;
  healthScore: number;
  healthStatus: HealthStatus;
  lastContactAt?: string;
  nextMeetingAt?: string;
  npsScore?: number;
  overdueTasksCount: number;
  riskReason?: string;
  serviceName?: string;
  nicheName?: string;
  state?: string;
  city?: string;
  ownerName?: string;
  monthlyValue?: number;
}

export type ClientListView = 'action_today' | 'onboarding_delayed' | 'detractors' | 'no_meeting' | 'critical' | 'promoters' | 'churned';

// Playbook types
export type PlaybookType = 'detractor' | 'onboarding_delayed' | 'critical' | 'no_meeting' | 'churn_prevention' | 'custom';

export const PLAYBOOK_TYPE_LABELS: Record<PlaybookType, string> = {
  detractor: 'Detrator',
  onboarding_delayed: 'Onboarding Atrasado',
  critical: 'Cliente Crítico',
  no_meeting: 'Sem Reunião',
  churn_prevention: 'Prevenção de Churn',
  custom: 'Personalizado',
};

export const ALERT_TYPE_LABELS: Record<Alert['type'], string> = {
  detractor_no_contact: 'Detrator sem Contato 48h',
  onboarding_stalled: 'Onboarding Parado',
  critical_no_playbook: 'Crítico sem Plano',
  meeting_overdue: 'Reunião Atrasada',
  task_sla_breached: 'SLA Estourado',
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  all: 'Todos',
  active: 'Ativo',
  onboarding: 'Onboarding',
  at_risk: 'Em Risco',
  churned: 'Cancelado',
};

export const HEALTH_STATUS_LABELS: Record<HealthStatus, string> = {
  healthy: 'Saudável',
  attention: 'Atenção',
  critical: 'Crítico',
};

export const METRIC_MODE_LABELS: Record<MetricMode, string> = {
  clients: 'Clientes',
  mrr: 'MRR',
};
