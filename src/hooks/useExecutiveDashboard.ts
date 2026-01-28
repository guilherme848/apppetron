import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format, differenceInMonths, parseISO, isValid } from 'date-fns';

export type PeriodFilter = 'current' | 'last3' | 'last6' | 'custom';
export type StatusFilter = 'active' | 'churned' | 'all';

interface Account {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  churned_at: string | null;
  monthly_value: number | null;
  service_id: string | null;
  niche_id: string | null;
}

interface Service {
  id: string;
  name: string;
}

interface Niche {
  id: string;
  name: string;
}

interface CohortData {
  cohortMonth: string;
  cohortLabel: string;
  months: (number | null)[];
  totalClients: number;
}

interface ChurnLTData {
  avgMonths: number;
  count: number;
}

interface DistributionItem {
  id: string | null;
  name: string;
  count: number;
  percentage: number;
}

interface TicketByNiche {
  nicheId: string | null;
  nicheName: string;
  avgTicket: number;
  clientCount: number;
}

export function useExecutiveDashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('current');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [nicheFilter, setNicheFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [accountsRes, servicesRes, nichesRes] = await Promise.all([
      supabase
        .from('accounts')
        .select('id, name, status, start_date, churned_at, monthly_value, service_id, niche_id')
        .is('deleted_at', null),
      supabase.from('services').select('id, name').order('name'),
      supabase.from('niches').select('id, name').order('name'),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (servicesRes.data) setServices(servicesRes.data);
    if (nichesRes.data) setNiches(nichesRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calculate date range based on period filter
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfMonth(now);

    switch (periodFilter) {
      case 'current':
        start = startOfMonth(now);
        break;
      case 'last3':
        start = startOfMonth(subMonths(now, 2));
        break;
      case 'last6':
        start = startOfMonth(subMonths(now, 5));
        break;
      case 'custom':
        start = customStartDate || startOfMonth(now);
        end = customEndDate || endOfMonth(now);
        break;
      default:
        start = startOfMonth(now);
    }

    return { start, end };
  }, [periodFilter, customStartDate, customEndDate]);

  // Apply filters to accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      // Status filter
      if (statusFilter === 'active' && a.status !== 'active') return false;
      if (statusFilter === 'churned' && a.status !== 'churned') return false;

      // Service filter
      if (serviceFilter && a.service_id !== serviceFilter) return false;

      // Niche filter
      if (nicheFilter && a.niche_id !== nicheFilter) return false;

      return true;
    });
  }, [accounts, statusFilter, serviceFilter, nicheFilter]);

  // KPIs
  const activeClients = useMemo(() => {
    return accounts.filter((a) => a.status === 'active').length;
  }, [accounts]);

  const churnedThisMonth = useMemo(() => {
    const { start, end } = dateRange;
    return accounts.filter((a) => {
      if (!a.churned_at) return false;
      const churnDate = parseISO(a.churned_at);
      return isValid(churnDate) && churnDate >= start && churnDate <= end;
    });
  }, [accounts, dateRange]);

  // LT of churns in period
  const churnLTData = useMemo((): ChurnLTData => {
    const churns = churnedThisMonth.filter((a) => a.start_date && a.churned_at);
    
    if (churns.length === 0) return { avgMonths: 0, count: 0 };

    const totalMonths = churns.reduce((sum, a) => {
      const start = parseISO(a.start_date!);
      const churn = parseISO(a.churned_at!);
      if (!isValid(start) || !isValid(churn)) return sum;
      return sum + Math.max(0, differenceInMonths(churn, start));
    }, 0);

    return {
      avgMonths: totalMonths / churns.length,
      count: churns.length,
    };
  }, [churnedThisMonth]);

  // Cohort Analysis (last 12 months)
  const cohortData = useMemo((): CohortData[] => {
    const now = new Date();
    const cohorts: CohortData[] = [];
    const maxMonthsToShow = 12;

    // Generate cohorts for last 12 months
    for (let i = 11; i >= 0; i--) {
      const cohortMonth = subMonths(now, i);
      const cohortStart = startOfMonth(cohortMonth);
      const cohortEnd = endOfMonth(cohortMonth);
      const cohortKey = format(cohortMonth, 'yyyy-MM');

      // Find clients who started in this cohort month
      let cohortClients = filteredAccounts.filter((a) => {
        if (!a.start_date) return false;
        const startDate = parseISO(a.start_date);
        if (!isValid(startDate)) return false;
        return startDate >= cohortStart && startDate <= cohortEnd;
      });

      // Apply service/niche filters
      if (serviceFilter) {
        cohortClients = cohortClients.filter((a) => a.service_id === serviceFilter);
      }
      if (nicheFilter) {
        cohortClients = cohortClients.filter((a) => a.niche_id === nicheFilter);
      }

      if (cohortClients.length === 0) {
        cohorts.push({
          cohortMonth: cohortKey,
          cohortLabel: format(cohortMonth, 'MMM/yy'),
          months: Array(maxMonthsToShow).fill(null),
          totalClients: 0,
        });
        continue;
      }

      // Calculate retention for each month (M0, M1, M2, ...)
      const retentionRates: (number | null)[] = [];
      
      for (let m = 0; m < maxMonthsToShow; m++) {
        const targetMonth = subMonths(now, i - m);
        
        // If target month is in the future relative to now, mark as null
        if (targetMonth > now) {
          retentionRates.push(null);
          continue;
        }

        const targetEnd = endOfMonth(targetMonth);
        
        // Count clients still active at end of target month
        const activeAtEnd = cohortClients.filter((a) => {
          // If never churned, still active
          if (!a.churned_at) return true;
          // If churned after target month end, still active at that point
          const churnDate = parseISO(a.churned_at);
          return isValid(churnDate) && churnDate > targetEnd;
        }).length;

        retentionRates.push(Math.round((activeAtEnd / cohortClients.length) * 100));
      }

      cohorts.push({
        cohortMonth: cohortKey,
        cohortLabel: format(cohortMonth, 'MMM/yy'),
        months: retentionRates,
        totalClients: cohortClients.length,
      });
    }

    return cohorts;
  }, [filteredAccounts, serviceFilter, nicheFilter]);

  // Distribution by Plan (Service)
  const distributionByPlan = useMemo((): DistributionItem[] => {
    const activeAccounts = accounts.filter((a) => a.status === 'active');
    const total = activeAccounts.length;
    
    if (total === 0) return [];

    const countByService: Record<string, number> = {};
    let noService = 0;

    activeAccounts.forEach((a) => {
      if (a.service_id) {
        countByService[a.service_id] = (countByService[a.service_id] || 0) + 1;
      } else {
        noService++;
      }
    });

    const distribution: DistributionItem[] = Object.entries(countByService).map(([id, count]) => {
      const service = services.find((s) => s.id === id);
      return {
        id,
        name: service?.name || 'Desconhecido',
        count,
        percentage: Math.round((count / total) * 100),
      };
    });

    if (noService > 0) {
      distribution.push({
        id: null,
        name: 'Sem plano',
        count: noService,
        percentage: Math.round((noService / total) * 100),
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }, [accounts, services]);

  // Distribution by Niche
  const distributionByNiche = useMemo((): DistributionItem[] => {
    const activeAccounts = accounts.filter((a) => a.status === 'active');
    const total = activeAccounts.length;
    
    if (total === 0) return [];

    const countByNiche: Record<string, number> = {};
    let noNiche = 0;

    activeAccounts.forEach((a) => {
      if (a.niche_id) {
        countByNiche[a.niche_id] = (countByNiche[a.niche_id] || 0) + 1;
      } else {
        noNiche++;
      }
    });

    const distribution: DistributionItem[] = Object.entries(countByNiche).map(([id, count]) => {
      const niche = niches.find((n) => n.id === id);
      return {
        id,
        name: niche?.name || 'Desconhecido',
        count,
        percentage: Math.round((count / total) * 100),
      };
    });

    if (noNiche > 0) {
      distribution.push({
        id: null,
        name: 'Sem nicho',
        count: noNiche,
        percentage: Math.round((noNiche / total) * 100),
      });
    }

    return distribution.sort((a, b) => b.count - a.count);
  }, [accounts, niches]);

  // Ticket by Niche
  const ticketByNiche = useMemo((): TicketByNiche[] => {
    const activeAccounts = accounts.filter(
      (a) => a.status === 'active' && a.monthly_value != null && a.monthly_value > 0
    );

    if (activeAccounts.length === 0) return [];

    const nicheData: Record<string, { total: number; count: number }> = {};
    let noNicheData = { total: 0, count: 0 };

    activeAccounts.forEach((a) => {
      const value = Number(a.monthly_value);
      if (a.niche_id) {
        if (!nicheData[a.niche_id]) {
          nicheData[a.niche_id] = { total: 0, count: 0 };
        }
        nicheData[a.niche_id].total += value;
        nicheData[a.niche_id].count++;
      } else {
        noNicheData.total += value;
        noNicheData.count++;
      }
    });

    const result: TicketByNiche[] = Object.entries(nicheData).map(([id, data]) => {
      const niche = niches.find((n) => n.id === id);
      return {
        nicheId: id,
        nicheName: niche?.name || 'Desconhecido',
        avgTicket: data.total / data.count,
        clientCount: data.count,
      };
    });

    if (noNicheData.count > 0) {
      result.push({
        nicheId: null,
        nicheName: 'Sem nicho',
        avgTicket: noNicheData.total / noNicheData.count,
        clientCount: noNicheData.count,
      });
    }

    return result.sort((a, b) => b.avgTicket - a.avgTicket);
  }, [accounts, niches]);

  // Total MRR (for financial cards)
  const totalMrr = useMemo(() => {
    return accounts
      .filter((a) => a.status === 'active')
      .reduce((sum, a) => sum + Number(a.monthly_value || 0), 0);
  }, [accounts]);

  // Average Ticket (global)
  const avgTicket = useMemo(() => {
    const activeWithValue = accounts.filter(
      (a) => a.status === 'active' && a.monthly_value != null && a.monthly_value > 0
    );
    if (activeWithValue.length === 0) return 0;
    return (
      activeWithValue.reduce((sum, a) => sum + Number(a.monthly_value), 0) / activeWithValue.length
    );
  }, [accounts]);

  return {
    loading,
    accounts,
    services,
    niches,
    // Filters
    periodFilter,
    setPeriodFilter,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    serviceFilter,
    setServiceFilter,
    nicheFilter,
    setNicheFilter,
    statusFilter,
    setStatusFilter,
    dateRange,
    // KPIs
    activeClients,
    churnedThisMonth: churnedThisMonth.length,
    churnLTData,
    totalMrr,
    avgTicket,
    // Analytics
    cohortData,
    distributionByPlan,
    distributionByNiche,
    ticketByNiche,
    // Actions
    refetch: fetchData,
  };
}
