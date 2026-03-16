import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format, subMonths, differenceInDays, differenceInMonths, parseISO, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CsOverviewKPI {
  activeClients: number;
  onboardingClients: number;
  onboardingOnTime: number;
  onboardingDelayed: number;
  atRiskClients: number;
  churnCount: number;
  revenueAtRisk: number;
}

export interface FinancialMetrics {
  avgLT: number;
  avgLTV: number;
  maxLT: number;
  minLT: number;
  maxLTV: { value: number; name: string };
  churnRate: number;
  churnCount: number;
  revenueLost: number;
  churnedClientNames: string[];
  churnHistory: ChurnHistoryItem[];
}

export interface ChurnHistoryItem {
  label: string;
  month: string;
  cancelations: number;
  churnRate: number;
  revenueLost: number;
  isCurrent: boolean;
}

export interface CsAlert {
  id: string;
  type: 'onboarding_delayed' | 'meeting_overdue' | 'traffic_no_checkin' | 'recent_churn';
  clientId: string;
  clientName: string;
  details: string;
  severity: 'high' | 'medium';
}

export interface HealthDistData {
  healthy: number;
  attention: number;
  critical: number;
  unclassified: number;
  criticalClients: { id: string; name: string; csOwner: string | null }[];
}

export interface ChurnDimensionItem {
  name: string;
  churnCount: number;
  totalClients: number;
  churnRate: number;
}

export interface CohortRow {
  label: string;
  totalClients: number;
  months: (number | null)[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCsOverview() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [checkups, setCheckups] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [niches, setNiches] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<Date>(startOfMonth(now));

  // Generate month options (current + last 12)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    for (let i = 0; i < 13; i++) {
      const d = subMonths(now, i);
      const monthStart = startOfMonth(d);
      options.push({
        value: monthStart.toISOString(),
        label: format(monthStart, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase()),
      });
    }
    return options;
  }, []);

  const isCurrentMonth = useMemo(() => {
    return startOfMonth(now).getTime() === selectedMonth.getTime();
  }, [selectedMonth]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [acRes, obRes, ckRes, svcRes, nicRes, tmRes] = await Promise.all([
      supabase.from('accounts').select('*').is('deleted_at', null),
      supabase.from('onboardings').select('*'),
      supabase.from('cliente_checkup').select('*'),
      supabase.from('services').select('id, name').order('name'),
      supabase.from('niches').select('id, name').order('name'),
      supabase.from('team_members').select('id, name'),
    ]);
    if (acRes.data) setAccounts(acRes.data);
    if (obRes.data) setOnboardings(obRes.data);
    if (ckRes.data) setCheckups(ckRes.data);
    if (svcRes.data) setServices(svcRes.data);
    if (nicRes.data) setNiches(nicRes.data);
    if (tmRes.data) setTeamMembers(tmRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const monthStart = selectedMonth;
  const monthEnd = endOfMonth(selectedMonth);

  const isActiveAtMonthStartByDate = useCallback((account: any, referenceStart: Date) => {
    if (!account.start_date) return false;
    const startDate = parseISO(account.start_date);
    if (!isValid(startDate) || startDate > referenceStart) return false;

    if (!account.churned_at) return true;
    const churnDate = parseISO(account.churned_at);
    if (!isValid(churnDate)) return true;

    return churnDate > referenceStart;
  }, []);

  // KPIs
  const kpiData = useMemo((): CsOverviewKPI => {
    const active = accounts.filter(a => a.status === 'active');

    // Onboarding in selected month
    const onbInMonth = onboardings.filter(o => {
      if (!o.data_inicio) return false;
      const d = parseISO(o.data_inicio);
      return isValid(d) && d >= monthStart && d <= monthEnd && o.status !== 'concluido';
    });
    const delayed = onbInMonth.filter(o => {
      if (!o.data_inicio) return false;
      return differenceInDays(now, parseISO(o.data_inicio)) > 10;
    });

    // At risk = checkup D
    const atRisk = accounts.filter(a => a.status === 'active' && a.checkup_classificacao === 'D');

    // Churn in selected month (by churned_at, same as executive dashboard)
    const churned = accounts.filter(a => {
      if (!a.churned_at) return false;
      const d = parseISO(a.churned_at);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    });

    // Revenue at risk (C or D)
    const revenueAtRisk = accounts
      .filter(a => a.status === 'active' && (a.checkup_classificacao === 'C' || a.checkup_classificacao === 'D'))
      .reduce((sum, a) => sum + Number(a.monthly_value || 0), 0);

    return {
      activeClients: active.length,
      onboardingClients: onbInMonth.length,
      onboardingOnTime: onbInMonth.length - delayed.length,
      onboardingDelayed: delayed.length,
      atRiskClients: atRisk.length,
      churnCount: churned.length,
      revenueAtRisk,
    };
  }, [accounts, onboardings, monthStart, monthEnd]);

  // Alerts (always today, not filtered by month)
  const alerts = useMemo((): CsAlert[] => {
    const result: CsAlert[] = [];

    // Onboarding delayed >10 days
    const delayedOnb = onboardings.filter(o => {
      if (o.status === 'concluido') return false;
      if (!o.data_inicio) return false;
      return differenceInDays(now, parseISO(o.data_inicio)) > 10;
    });
    delayedOnb.forEach(o => {
      const account = accounts.find(a => a.id === o.client_id);
      if (account) {
        result.push({
          id: `onb-${o.id}`,
          type: 'onboarding_delayed',
          clientId: account.id,
          clientName: account.name,
          details: `Onboarding há ${differenceInDays(now, parseISO(o.data_inicio))} dias`,
          severity: 'high',
        });
      }
    });

    // Recent churn (this month)
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    accounts.filter(a => {
      if (!a.churned_at) return false;
      const d = parseISO(a.churned_at);
      return isValid(d) && d >= currentMonthStart && d <= currentMonthEnd;
    }).forEach(a => {
      result.push({
        id: `churn-${a.id}`,
        type: 'recent_churn',
        clientId: a.id,
        clientName: a.name,
        details: 'Cancelou neste mês',
        severity: 'high',
      });
    });

    return result.slice(0, 20);
  }, [accounts, onboardings]);

  // Health distribution based on checkup
  const healthDist = useMemo((): HealthDistData => {
    const active = accounts.filter(a => a.status === 'active');
    const healthy = active.filter(a => a.checkup_classificacao === 'A' || a.checkup_classificacao === 'B');
    const attention = active.filter(a => a.checkup_classificacao === 'C');
    const critical = active.filter(a => a.checkup_classificacao === 'D');
    const unclassified = active.filter(a => !a.checkup_classificacao);

    const criticalClients = critical.slice(0, 3).map(a => ({
      id: a.id,
      name: a.name,
      csOwner: a.cs_member_id ? (teamMembers.find(t => t.id === a.cs_member_id)?.name || null) : null,
    }));

    return {
      healthy: healthy.length,
      attention: attention.length,
      critical: critical.length,
      unclassified: unclassified.length,
      criticalClients,
    };
  }, [accounts, teamMembers]);

  // Clients that were active at start of selected month
  const activeAtMonthStart = useMemo(() => {
    return accounts.filter(a => isActiveAtMonthStartByDate(a, monthStart));
  }, [accounts, monthStart, isActiveAtMonthStartByDate]);

  // Churn by niche (filtered by month)
  const churnByNiche = useMemo((): ChurnDimensionItem[] => {
    const churned = accounts.filter(a => {
      if (!a.churned_at) return false;
      const d = parseISO(a.churned_at);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    });

    const byNiche: Record<string, { count: number; total: number; name: string }> = {};
    churned.forEach(a => {
      const nicheId = a.niche_id || 'none';
      const niche = niches.find(n => n.id === nicheId);
      if (!byNiche[nicheId]) byNiche[nicheId] = { count: 0, total: 0, name: niche?.name || 'Sem Nicho' };
      byNiche[nicheId].count++;
    });
    activeAtMonthStart.forEach(a => {
      const nicheId = a.niche_id || 'none';
      const niche = niches.find(n => n.id === nicheId);
      if (!byNiche[nicheId]) byNiche[nicheId] = { count: 0, total: 0, name: niche?.name || 'Sem Nicho' };
      byNiche[nicheId].total++;
    });

    return Object.values(byNiche)
      .map(d => ({ name: d.name, churnCount: d.count, totalClients: d.total, churnRate: d.total > 0 ? (d.count / d.total) * 100 : 0 }))
      .filter(d => d.churnCount > 0)
      .sort((a, b) => b.churnRate - a.churnRate);
  }, [accounts, niches, monthStart, monthEnd, activeAtMonthStart]);

  // Churn by plan (only Start, Performance, Escala, Growth)
  const validPlans = ['Start', 'Performance', 'Escala', 'Growth'];
  const churnByPlan = useMemo((): ChurnDimensionItem[] => {
    const churned = accounts.filter(a => {
      if (!a.churned_at) return false;
      const d = parseISO(a.churned_at);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    });

    const byPlan: Record<string, { count: number; total: number; name: string }> = {};
    validPlans.forEach(name => {
      byPlan[name] = { count: 0, total: 0, name };
    });

    const getServiceName = (sId: string | null) => {
      if (!sId) return null;
      return services.find(s => s.id === sId)?.name || null;
    };

    churned.forEach(a => {
      const sName = getServiceName(a.service_id);
      if (sName && validPlans.includes(sName)) {
        byPlan[sName].count++;
      }
    });
    activeAtMonthStart.forEach(a => {
      const sName = getServiceName(a.service_id);
      if (sName && validPlans.includes(sName)) {
        byPlan[sName].total++;
      }
    });

    return Object.values(byPlan)
      .map(d => ({ name: d.name, churnCount: d.count, totalClients: d.total, churnRate: d.total > 0 ? (d.count / d.total) * 100 : 0 }))
      .sort((a, b) => b.churnRate - a.churnRate);
  }, [accounts, services, monthStart, monthEnd, activeAtMonthStart]);

  // Cohort analysis (always last 12 months, not filtered)
  const cohortData = useMemo((): CohortRow[] => {
    const rows: CohortRow[] = [];
    for (let i = 11; i >= 0; i--) {
      const cohortMonth = startOfMonth(subMonths(now, i));
      const label = format(cohortMonth, "MMM/yy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());

      const cohortClients = accounts.filter(a => {
        if (!a.start_date) return false;
        const d = parseISO(a.start_date);
        return isValid(d) && startOfMonth(d).getTime() === cohortMonth.getTime();
      });

      const total = cohortClients.length;
      if (total === 0) {
        rows.push({ label, totalClients: 0, months: Array(12).fill(null) });
        continue;
      }

      const monthValues: (number | null)[] = [];
      for (let m = 0; m < 12; m++) {
        const checkMonth = startOfMonth(subMonths(now, i - m));
        if (checkMonth > startOfMonth(now)) {
          monthValues.push(null);
          continue;
        }
        const stillActive = cohortClients.filter(a => {
          // If never churned, still active
          if (!a.churned_at) return true;
          // If churned after target month end, still active at that point
          const churnDate = parseISO(a.churned_at);
          return isValid(churnDate) && churnDate > endOfMonth(checkMonth);
        });
        monthValues.push(Math.round((stillActive.length / total) * 100));
      }

      rows.push({ label, totalClients: total, months: monthValues });
    }
    return rows;
  }, [accounts]);

  // Financial metrics
  const financialMetrics = useMemo((): FinancialMetrics => {
    const active = accounts.filter(a => a.status === 'active');

    // LT per active client (months since start_date)
    const ltValues = active
      .filter(a => a.start_date)
      .map(a => {
        const start = parseISO(a.start_date);
        return isValid(start) ? differenceInMonths(now, start) : 0;
      });

    const avgLT = ltValues.length > 0 ? ltValues.reduce((s, v) => s + v, 0) / ltValues.length : 0;
    const maxLT = ltValues.length > 0 ? Math.max(...ltValues) : 0;
    const minLT = ltValues.length > 0 ? Math.min(...ltValues) : 0;

    // LTV per active client (LT * monthly_value)
    const ltvValues = active
      .filter(a => a.start_date && a.monthly_value)
      .map(a => {
        const start = parseISO(a.start_date);
        const lt = isValid(start) ? differenceInMonths(now, start) : 0;
        return { value: lt * Number(a.monthly_value || 0), name: a.name };
      });

    const avgLTV = ltvValues.length > 0 ? ltvValues.reduce((s, v) => s + v.value, 0) / ltvValues.length : 0;
    const maxLTVEntry = ltvValues.length > 0
      ? ltvValues.reduce((max, v) => v.value > max.value ? v : max, ltvValues[0])
      : { value: 0, name: '' };

    // Churn in selected month
    const churnedInMonth = accounts.filter(a => {
      if (!a.churned_at) return false;
      const d = parseISO(a.churned_at);
      return isValid(d) && d >= monthStart && d <= monthEnd;
    });

    const revenueLost = churnedInMonth.reduce((s, a) => s + Number(a.monthly_value || 0), 0);

    // Active at start of selected month
    const activeAtStart = accounts.filter(a => {
      if (a.status === 'active') return true;
      if (a.churned_at) {
        const d = parseISO(a.churned_at);
        return isValid(d) && d >= monthStart;
      }
      return false;
    }).length;

    const churnRate = activeAtStart > 0 ? (churnedInMonth.length / activeAtStart) * 100 : 0;

    // Churn history (last 12 months, always)
    const churnHistory: ChurnHistoryItem[] = [];
    const currentMonthKey = format(startOfMonth(now), 'yyyy-MM');
    for (let i = 11; i >= 0; i--) {
      const m = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(m);
      const label = format(m, "MMM/yy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());

      const churnedThisMonth = accounts.filter(a => {
        if (!a.churned_at) return false;
        const d = parseISO(a.churned_at);
        return isValid(d) && d >= m && d <= mEnd;
      });

      const activeAtM = accounts.filter(a => {
        if (a.status === 'active') return true;
        if (a.churned_at) {
          const d = parseISO(a.churned_at);
          return isValid(d) && d >= m;
        }
        return false;
      }).length;

      churnHistory.push({
        label,
        month: format(m, 'yyyy-MM'),
        cancelations: churnedThisMonth.length,
        churnRate: activeAtM > 0 ? (churnedThisMonth.length / activeAtM) * 100 : 0,
        revenueLost: churnedThisMonth.reduce((s, a) => s + Number(a.monthly_value || 0), 0),
        isCurrent: format(m, 'yyyy-MM') === currentMonthKey,
      });
    }

    return {
      avgLT: Math.round(avgLT * 10) / 10,
      avgLTV,
      maxLT,
      minLT,
      maxLTV: maxLTVEntry,
      churnRate: Math.round(churnRate * 10) / 10,
      churnCount: churnedInMonth.length,
      revenueLost,
      churnedClientNames: churnedInMonth.map(a => a.name),
      churnHistory,
    };
  }, [accounts, monthStart, monthEnd]);

  const selectedMonthLabel = format(selectedMonth, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());

  return {
    loading,
    selectedMonth,
    setSelectedMonth,
    monthOptions,
    isCurrentMonth,
    selectedMonthLabel,
    kpiData,
    alerts,
    healthDist,
    churnByNiche,
    churnByPlan,
    cohortData,
    financialMetrics,
    refetch: fetchData,
  };
}
