// Traffic Analytics Types

export interface TrafficMetricCatalog {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: MetricCategory;
  unit: MetricUnit;
  source: string;
  metric_type: MetricType;
  formula: string | null;
  dependencies: string[] | null;
  availability_objectives: string[] | null;
  availability_platforms: string[] | null;
  visible_for_managers: boolean;
  is_active: boolean;
  default_order: number;
  created_at: string;
  updated_at: string;
}

export interface TrafficMetricTarget {
  id: string;
  metric_slug: string;
  scope: TargetScope;
  niche_id: string | null;
  objective: string | null;
  invest_min: number | null;
  invest_max: number | null;
  better_when: 'lower' | 'higher';
  green_min: number | null;
  green_max: number | null;
  yellow_min: number | null;
  yellow_max: number | null;
  red_min: number | null;
  red_max: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrafficScore {
  id: string;
  name: string;
  config_json: ScoreConfig;
  green_threshold: number;
  yellow_threshold: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ScoreConfig {
  metrics: { slug: string; weight: number }[];
  normalize_by: 'benchmark_global' | 'benchmark_niche';
  clamp: [number, number];
}

export interface TrafficAlertRule {
  id: string;
  name: string;
  metric_slug: string;
  condition: AlertCondition;
  threshold: number | null;
  window_days: number;
  severity: AlertSeverity;
  message: string;
  action_hint: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrafficDashboardLayout {
  id: string;
  scope: 'global' | 'objective';
  objective: string | null;
  cards: DashboardCard[];
  columns: DashboardColumn[];
  created_at: string;
  updated_at: string;
}

export interface DashboardCard {
  slug: string;
  label: string;
}

export interface DashboardColumn {
  slug: string;
  pinned?: boolean;
  order: number;
}

export interface TrafficSavedView {
  id: string;
  user_id: string;
  name: string;
  filters_json: SavedViewFilters;
  columns_json: DashboardColumn[];
  created_at: string;
}

export interface SavedViewFilters {
  period?: string;
  manager_id?: string;
  client_id?: string;
  platform?: string;
  objective?: string;
  niche_id?: string;
  status?: string;
}

export interface AdAccountMetricsDaily {
  id: string;
  ad_account_id: string;
  platform: string;
  date: string;
  metrics_json: Record<string, number>;
  created_at: string;
}

// Enums
export type MetricCategory = 'entrega' | 'clique' | 'custo' | 'conversao' | 'diagnostico';
export type MetricUnit = 'BRL' | 'PERCENT' | 'NUMBER';
export type MetricType = 'simple' | 'calculated';
export type TargetScope = 'global' | 'nicho' | 'objetivo' | 'invest_range';
export type AlertCondition = 'gt' | 'lt' | 'delta_pct_gt' | 'delta_pct_lt' | 'below_p25' | 'above_p75' | 'outside_target';
export type AlertSeverity = 'info' | 'attention' | 'critical';
export type HealthStatus = 'green' | 'yellow' | 'red';

// Display Options
export const METRIC_CATEGORY_OPTIONS = [
  { value: 'entrega', label: 'Entrega' },
  { value: 'clique', label: 'Clique' },
  { value: 'custo', label: 'Custo' },
  { value: 'conversao', label: 'Conversão' },
  { value: 'diagnostico', label: 'Diagnóstico' },
] as const;

export const METRIC_UNIT_OPTIONS = [
  { value: 'BRL', label: 'R$ (Moeda)' },
  { value: 'PERCENT', label: '% (Porcentagem)' },
  { value: 'NUMBER', label: 'Número' },
] as const;

export const METRIC_TYPE_OPTIONS = [
  { value: 'simple', label: 'Simples (direto da API)' },
  { value: 'calculated', label: 'Calculada (fórmula)' },
] as const;

export const TARGET_SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'nicho', label: 'Por Nicho' },
  { value: 'objetivo', label: 'Por Objetivo' },
  { value: 'invest_range', label: 'Por Faixa de Investimento' },
] as const;

export const ALERT_CONDITION_OPTIONS = [
  { value: 'gt', label: 'Maior que' },
  { value: 'lt', label: 'Menor que' },
  { value: 'delta_pct_gt', label: 'Variação % maior que' },
  { value: 'delta_pct_lt', label: 'Variação % menor que' },
  { value: 'below_p25', label: 'Abaixo do P25 (benchmark)' },
  { value: 'above_p75', label: 'Acima do P75 (benchmark)' },
  { value: 'outside_target', label: 'Fora da meta' },
] as const;

export const ALERT_SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'attention', label: 'Atenção' },
  { value: 'critical', label: 'Crítico' },
] as const;

export const PERIOD_OPTIONS = [
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'custom', label: 'Personalizado' },
] as const;

export const OBJECTIVE_OPTIONS = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'lead', label: 'Geração de Leads' },
  { value: 'purchase', label: 'Compras' },
  { value: 'traffic', label: 'Tráfego' },
] as const;

// Computed types for UI
export interface AccountPerformanceRow {
  clientId: string;
  clientName: string;
  adAccountId: string;
  adAccountName: string;
  managerId: string | null;
  managerName: string | null;
  platform: string;
  nicheId: string | null;
  nicheName: string | null;
  status: string;
  metrics: Record<string, number | null>;
  score: number | null;
  healthStatus: HealthStatus;
  alerts: AccountAlert[];
}

export interface AccountAlert {
  ruleId: string;
  ruleName: string;
  metricSlug: string;
  severity: AlertSeverity;
  message: string;
  actionHint: string | null;
}

export interface BenchmarkData {
  metric_slug: string;
  p25: number;
  p50: number;
  p75: number;
  count: number;
}
