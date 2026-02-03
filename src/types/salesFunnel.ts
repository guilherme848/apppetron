// =============================================
// PETRON SALES FUNNEL - TYPES
// =============================================

export interface SalesFunnelTarget {
  id: string;
  month: string; // ISO date (always 1st day)
  investment_target: number | null;
  leads_target: number | null;
  cpl_target: number | null;
  rate_scheduling_target: number | null;
  appointments_target: number | null;
  rate_attendance_target: number | null;
  meetings_held_target: number | null;
  rate_close_target: number | null;
  sales_target: number | null;
  avg_ticket_target: number | null;
  revenue_target: number | null;
  roas_target: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesFunnelActual {
  id: string;
  month: string;
  investment_actual: number | null;
  leads_actual: number | null;
  cpl_actual: number | null;
  rate_scheduling_actual: number | null;
  appointments_actual: number | null;
  rate_attendance_actual: number | null;
  meetings_held_actual: number | null;
  rate_close_actual: number | null;
  sales_actual: number | null;
  avg_ticket_actual: number | null;
  revenue_actual: number | null;
  roas_actual: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalesFunnelKPI {
  month: string;
  // Targets
  investment_target: number | null;
  leads_target: number | null;
  cpl_target: number | null;
  rate_scheduling_target: number | null;
  appointments_target: number | null;
  rate_attendance_target: number | null;
  meetings_held_target: number | null;
  rate_close_target: number | null;
  sales_target: number | null;
  avg_ticket_target: number | null;
  revenue_target: number | null;
  roas_target: number | null;
  // Actuals
  investment_actual: number | null;
  leads_actual: number | null;
  cpl_actual: number | null;
  appointments_actual: number | null;
  rate_scheduling_actual: number | null;
  meetings_held_actual: number | null;
  rate_attendance_actual: number | null;
  sales_actual: number | null;
  rate_close_actual: number | null;
  avg_ticket_actual: number | null;
  revenue_actual: number | null;
  roas_actual: number | null;
  // Conversions
  conv_leads_to_appointments: number | null;
  conv_appointments_to_meetings: number | null;
  conv_meetings_to_sales: number | null;
  conv_leads_to_sales: number | null;
  // MoM changes
  leads_mom_change: number | null;
  meetings_mom_change: number | null;
  sales_mom_change: number | null;
  roas_mom_change: number | null;
  // Target achievement
  leads_achievement: number | null;
  sales_achievement: number | null;
  revenue_achievement: number | null;
  roas_achievement: number | null;
  // Notes
  actual_notes: string | null;
  target_notes: string | null;
}

export type SalesFunnelTab = 'targets' | 'actuals' | 'dashboard';

export interface FunnelFilters {
  year: number;
  startMonth?: number;
  endMonth?: number;
}

export const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const formatPercent = (value: number | null, decimals = 1): string => {
  if (value === null || value === undefined) return '-';
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR').format(value);
};

export const formatRoas = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}x`;
};
