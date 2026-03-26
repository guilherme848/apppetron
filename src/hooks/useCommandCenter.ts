import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { subDays, startOfDay, endOfDay, differenceInDays, differenceInMonths, parseISO, isValid, format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import {
  CommandCenterFilters,
  KPIData,
  OnboardingFunnel,
  Alert,
  HealthDistribution,
  NpsDistribution,
  ChurnByDimension,
  ChurnEvent,
  Playbook,
  ClientListItem,
  ClientListView,
  PeriodFilter,
} from '@/types/commandCenter';
import { getNpsClassification } from '@/hooks/useCsData';

interface TeamMember {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
}

interface Niche {
  id: string;
  name: string;
}

export function useCommandCenter() {
  // Data states
  const [accounts, setAccounts] = useState<any[]>([]);
  const [onboardings, setOnboardings] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [npsResponses, setNpsResponses] = useState<any[]>([]);
  const [playbooks, setPlaybooks] = useState<any[]>([]);
  const [churnEvents, setChurnEvents] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [csMembers, setCsMembers] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [niches, setNiches] = useState<Niche[]>([]);
  const [alertConfigs, setAlertConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<CommandCenterFilters>({
    period: '30d',
    csOwnerId: null,
    status: 'all',
    nicheId: null,
    serviceId: null,
    state: null,
    city: null,
    origin: null,
    churnReason: null,
    metricMode: 'clients',
  });

  // Calculate date range
  const dateRange = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (filters.period) {
      case '7d':
        start = startOfDay(subDays(now, 7));
        break;
      case '30d':
        start = startOfDay(subDays(now, 30));
        break;
      case '90d':
        start = startOfDay(subDays(now, 90));
        break;
      case '180d':
        start = startOfDay(subDays(now, 180));
        break;
      case 'custom':
        start = filters.customStartDate ? startOfDay(filters.customStartDate) : startOfDay(subDays(now, 30));
        end = filters.customEndDate ? endOfDay(filters.customEndDate) : endOfDay(now);
        break;
      default:
        start = startOfDay(subDays(now, 30));
    }

    return { start, end };
  }, [filters.period, filters.customStartDate, filters.customEndDate]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    setLoading(true);

    const [
      accountsRes,
      onboardingsRes,
      meetingsRes,
      npsRes,
      playbooksRes,
      churnEventsRes,
      cancellationsRes,
      membersRes,
      servicesRes,
      nichesRes,
      alertConfigsRes,
    ] = await Promise.all([
      supabase.from('accounts').select('*').is('deleted_at', null).or('cliente_interno.is.null,cliente_interno.eq.false'),
      supabase.from('cs_client_onboarding').select('*, accounts:client_id(name)'),
      supabase.from('cs_meetings').select('*, accounts:client_id(name), team_members:responsible_member_id(name)'),
      supabase.from('cs_nps_responses').select('*, accounts:client_id(name)'),
      supabase.from('cs_playbooks').select('*, accounts:client_id(name), team_members:responsible_member_id(name)'),
      supabase.from('cs_churn_events').select('*, accounts:client_id(name, niche_id, service_id, state), team_members:owner_member_id(name)'),
      supabase.from('cs_cancellations').select('*, accounts:client_id(name)'),
      supabase.from('team_members').select('id, name'),
      supabase.from('services').select('id, name').order('name'),
      supabase.from('niches').select('id, name').order('name'),
      supabase.from('cs_alert_config').select('*'),
    ]);

    if (accountsRes.data) setAccounts(accountsRes.data);
    if (onboardingsRes.data) setOnboardings(onboardingsRes.data);
    if (meetingsRes.data) setMeetings(meetingsRes.data);
    if (npsRes.data) setNpsResponses(npsRes.data);
    if (playbooksRes.data) setPlaybooks(playbooksRes.data);
    if (churnEventsRes.data) setChurnEvents(churnEventsRes.data);
    if (cancellationsRes.data) setCancellations(cancellationsRes.data);
    
    // Get CS members from accounts
    const csMemberIds = new Set(accountsRes.data?.map(a => a.cs_member_id).filter(Boolean));
    const csRes = await supabase.from('team_members').select('id, name').in('id', Array.from(csMemberIds));
    if (csRes.data) setCsMembers(csRes.data);
    
    if (servicesRes.data) setServices(servicesRes.data);
    if (nichesRes.data) setNiches(nichesRes.data);
    if (alertConfigsRes.data) setAlertConfigs(alertConfigsRes.data);

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter accounts based on filters
  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => {
      if (filters.csOwnerId && a.cs_member_id !== filters.csOwnerId) return false;
      if (filters.nicheId && a.niche_id !== filters.nicheId) return false;
      if (filters.serviceId && a.service_id !== filters.serviceId) return false;
      if (filters.state && a.state !== filters.state) return false;
      if (filters.origin && a.origin !== filters.origin) return false;
      
      if (filters.status !== 'all') {
        if (filters.status === 'active' && a.status !== 'active') return false;
        if (filters.status === 'churned' && a.status !== 'churned' && a.status !== 'canceled') return false;
        if (filters.status === 'at_risk' && a.health_status !== 'critical' && a.health_status !== 'attention') return false;
        if (filters.status === 'onboarding') {
          const hasOnboarding = onboardings.some(o => o.client_id === a.id && o.status !== 'completed');
          if (!hasOnboarding) return false;
        }
      }
      
      return true;
    });
  }, [accounts, onboardings, filters]);

  // KPIs
  const kpiData = useMemo((): KPIData => {
    const active = accounts.filter(a => a.status === 'active');
    const atRisk = accounts.filter(a => a.health_status === 'critical' || a.health_status === 'attention');
    const inOnboarding = onboardings.filter(o => o.status === 'in_progress' || o.status === 'not_started');
    const onboardingOnTime = inOnboarding.filter(o => {
      if (!o.expected_end_at) return true;
      return new Date(o.expected_end_at) >= new Date();
    });

    // Churns in period
    const churnsInPeriod = accounts.filter(a => {
      if (!a.churned_at) return false;
      const churnDate = parseISO(a.churned_at);
      return isValid(churnDate) && churnDate >= dateRange.start && churnDate <= dateRange.end;
    });

    // NPS average
    const npsInPeriod = npsResponses.filter(n => {
      const date = parseISO(n.created_at);
      return isValid(date) && date >= dateRange.start && date <= dateRange.end;
    });
    const avgNps = npsInPeriod.length > 0
      ? npsInPeriod.reduce((sum, n) => sum + n.score, 0) / npsInPeriod.length
      : 0;

    // Avg onboarding time
    const completedOnboardings = onboardings.filter(o => o.status === 'completed' && o.started_at && o.completed_at);
    const avgOnboardingDays = completedOnboardings.length > 0
      ? completedOnboardings.reduce((sum, o) => {
          return sum + differenceInDays(parseISO(o.completed_at), parseISO(o.started_at));
        }, 0) / completedOnboardings.length
      : 0;

    // Avg time to churn
    const churnsWithDates = churnsInPeriod.filter(a => a.start_date && a.churned_at);
    const avgTimeToChurn = churnsWithDates.length > 0
      ? churnsWithDates.reduce((sum, a) => {
          return sum + differenceInDays(parseISO(a.churned_at), parseISO(a.start_date));
        }, 0) / churnsWithDates.length
      : 0;

    const churnMrr = churnsInPeriod.reduce((sum, a) => sum + Number(a.monthly_value || 0), 0);

    return {
      activeClients: active.length,
      activeClientsDelta: 0, // TODO: compare with previous period
      onboardingClients: inOnboarding.length,
      onboardingOnTime: onboardingOnTime.length,
      atRiskClients: atRisk.length,
      atRiskDelta: 0,
      avgNps: Math.round(avgNps * 10) / 10,
      npsDelta: 0,
      churnCount: churnsInPeriod.length,
      churnMrr,
      churnDelta: 0,
      avgOnboardingDays: Math.round(avgOnboardingDays),
      avgTimeToChurn: Math.round(avgTimeToChurn),
    };
  }, [accounts, onboardings, npsResponses, dateRange]);

  // Onboarding funnel
  const onboardingFunnel = useMemo((): OnboardingFunnel => {
    const created = onboardings.length;
    const inProgress = onboardings.filter(o => o.status === 'in_progress').length;
    const completed = onboardings.filter(o => o.status === 'completed').length;
    
    const activeOnboardings = onboardings.filter(o => o.status !== 'completed');
    const onTime = activeOnboardings.filter(o => {
      if (!o.expected_end_at) return true;
      return new Date(o.expected_end_at) >= new Date();
    }).length;
    const delayed = activeOnboardings.length - onTime;

    return { created, inProgress, completed, onTime, delayed };
  }, [onboardings]);

  // Health distribution
  const healthDistribution = useMemo((): HealthDistribution => {
    const activeAccounts = accounts.filter(a => a.status === 'active');
    return {
      healthy: activeAccounts.filter(a => a.health_status === 'healthy' || !a.health_status).length,
      attention: activeAccounts.filter(a => a.health_status === 'attention').length,
      critical: activeAccounts.filter(a => a.health_status === 'critical').length,
    };
  }, [accounts]);

  // NPS distribution
  const npsDistribution = useMemo((): NpsDistribution => {
    const npsInPeriod = npsResponses.filter(n => {
      const date = parseISO(n.created_at);
      return isValid(date) && date >= dateRange.start && date <= dateRange.end;
    });

    if (npsInPeriod.length === 0) {
      return { promoters: 0, passives: 0, detractors: 0, avgScore: 0 };
    }

    const promoters = npsInPeriod.filter(n => n.score >= 9).length;
    const passives = npsInPeriod.filter(n => n.score >= 7 && n.score <= 8).length;
    const detractors = npsInPeriod.filter(n => n.score <= 6).length;
    const avgScore = npsInPeriod.reduce((sum, n) => sum + n.score, 0) / npsInPeriod.length;

    return { promoters, passives, detractors, avgScore };
  }, [npsResponses, dateRange]);

  // Alerts
  const alerts = useMemo((): Alert[] => {
    const result: Alert[] = [];
    const now = new Date();

    // Get alert thresholds
    const getThreshold = (type: string) => {
      const config = alertConfigs.find(c => c.alert_type === type);
      return config?.threshold_days || 7;
    };

    // Detractors without contact in 48h
    const detractorThreshold = getThreshold('detractor_no_contact');
    const recentDetractors = npsResponses.filter(n => {
      const date = parseISO(n.created_at);
      const daysSince = differenceInDays(now, date);
      return n.classification === 'detractor' && daysSince <= detractorThreshold && daysSince >= 2;
    });
    
    recentDetractors.forEach(d => {
      // Check if there's a recent meeting or playbook
      const hasFollowup = meetings.some(m => 
        m.client_id === d.client_id && 
        parseISO(m.created_at) > parseISO(d.created_at)
      );
      
      if (!hasFollowup) {
        result.push({
          id: `det-${d.id}`,
          type: 'detractor_no_contact',
          clientId: d.client_id,
          clientName: d.accounts?.name || 'Cliente',
          details: `NPS ${d.score} há ${differenceInDays(now, parseISO(d.created_at))} dias`,
          severity: 'high',
          createdAt: d.created_at,
        });
      }
    });

    // Critical clients without playbook
    const criticalClients = accounts.filter(a => a.health_status === 'critical');
    criticalClients.forEach(c => {
      const hasActivePlaybook = playbooks.some(p => p.client_id === c.id && p.status === 'active');
      if (!hasActivePlaybook) {
        result.push({
          id: `crit-${c.id}`,
          type: 'critical_no_playbook',
          clientId: c.id,
          clientName: c.name,
          details: 'Sem plano de ação ativo',
          severity: 'high',
          createdAt: new Date().toISOString(),
        });
      }
    });

    // Overdue meetings
    const meetingThreshold = getThreshold('meeting_overdue');
    accounts.filter(a => a.status === 'active').forEach(a => {
      const lastMeeting = meetings
        .filter(m => m.client_id === a.id && m.status === 'done')
        .sort((x, y) => new Date(y.meeting_date).getTime() - new Date(x.meeting_date).getTime())[0];
      
      if (!lastMeeting) {
        const daysSinceStart = a.start_date ? differenceInDays(now, parseISO(a.start_date)) : 999;
        if (daysSinceStart > meetingThreshold) {
          result.push({
            id: `meet-${a.id}`,
            type: 'meeting_overdue',
            clientId: a.id,
            clientName: a.name,
            details: `Nunca teve reunião (${daysSinceStart} dias)`,
            severity: 'medium',
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        const daysSinceMeeting = differenceInDays(now, parseISO(lastMeeting.meeting_date));
        if (daysSinceMeeting > meetingThreshold) {
          result.push({
            id: `meet-${a.id}`,
            type: 'meeting_overdue',
            clientId: a.id,
            clientName: a.name,
            details: `Última reunião há ${daysSinceMeeting} dias`,
            severity: 'medium',
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    return result.slice(0, 20);
  }, [accounts, npsResponses, meetings, playbooks, alertConfigs]);

  // Churn by niche
  const churnByNiche = useMemo((): ChurnByDimension[] => {
    const churns = accounts.filter(a => {
      if (!a.churned_at) return false;
      const date = parseISO(a.churned_at);
      return isValid(date) && date >= dateRange.start && date <= dateRange.end;
    });

    const byNiche: Record<string, { count: number; mrr: number; total: number }> = {};

    // Count churns by niche
    churns.forEach(a => {
      const nicheId = a.niche_id || 'none';
      if (!byNiche[nicheId]) {
        byNiche[nicheId] = { count: 0, mrr: 0, total: 0 };
      }
      byNiche[nicheId].count++;
      byNiche[nicheId].mrr += Number(a.monthly_value || 0);
    });

    // Count total by niche
    accounts.forEach(a => {
      const nicheId = a.niche_id || 'none';
      if (!byNiche[nicheId]) {
        byNiche[nicheId] = { count: 0, mrr: 0, total: 0 };
      }
      byNiche[nicheId].total++;
    });

    return Object.entries(byNiche).map(([id, data]) => {
      const niche = niches.find(n => n.id === id);
      return {
        id,
        name: niche?.name || 'Sem Nicho',
        churnCount: data.count,
        churnMrr: data.mrr,
        churnRate: data.total > 0 ? (data.count / data.total) * 100 : 0,
        totalClients: data.total,
      };
    }).sort((a, b) => b.churnRate - a.churnRate);
  }, [accounts, niches, dateRange]);

  // Churn by service/plan
  const churnByService = useMemo((): ChurnByDimension[] => {
    const churns = accounts.filter(a => {
      if (!a.churned_at) return false;
      const date = parseISO(a.churned_at);
      return isValid(date) && date >= dateRange.start && date <= dateRange.end;
    });

    const byService: Record<string, { count: number; mrr: number; total: number }> = {};

    churns.forEach(a => {
      const serviceId = a.service_id || 'none';
      if (!byService[serviceId]) {
        byService[serviceId] = { count: 0, mrr: 0, total: 0 };
      }
      byService[serviceId].count++;
      byService[serviceId].mrr += Number(a.monthly_value || 0);
    });

    accounts.forEach(a => {
      const serviceId = a.service_id || 'none';
      if (!byService[serviceId]) {
        byService[serviceId] = { count: 0, mrr: 0, total: 0 };
      }
      byService[serviceId].total++;
    });

    return Object.entries(byService).map(([id, data]) => {
      const service = services.find(s => s.id === id);
      return {
        id,
        name: service?.name || 'Sem Plano',
        churnCount: data.count,
        churnMrr: data.mrr,
        churnRate: data.total > 0 ? (data.count / data.total) * 100 : 0,
        totalClients: data.total,
      };
    }).sort((a, b) => b.churnRate - a.churnRate);
  }, [accounts, services, dateRange]);

  // Playbooks list
  const activePlaybooks = useMemo((): Playbook[] => {
    return playbooks
      .filter(p => p.status === 'active')
      .map(p => ({
        id: p.id,
        clientId: p.client_id,
        clientName: p.accounts?.name || 'Cliente',
        type: p.type,
        status: p.status,
        responsibleName: p.team_members?.name,
        dueAt: p.due_at,
        progress: 0, // TODO: calculate from tasks
        tasksDone: 0,
        tasksTotal: 0,
      }));
  }, [playbooks]);

  // Client list
  const getClientList = useCallback((view: ClientListView): ClientListItem[] => {
    let filtered = filteredAccounts;
    const now = new Date();

    switch (view) {
      case 'action_today':
        // Clients needing attention today
        filtered = filtered.filter(a => {
          const isAtRisk = a.health_status === 'critical' || a.health_status === 'attention';
          const hasOverdueTasks = false; // TODO
          return isAtRisk || hasOverdueTasks;
        });
        break;
      case 'onboarding_delayed':
        const delayedIds = onboardings
          .filter(o => o.status !== 'completed' && o.expected_end_at && new Date(o.expected_end_at) < now)
          .map(o => o.client_id);
        filtered = filtered.filter(a => delayedIds.includes(a.id));
        break;
      case 'detractors':
        const detractorIds = npsResponses
          .filter(n => n.classification === 'detractor')
          .map(n => n.client_id);
        filtered = filtered.filter(a => detractorIds.includes(a.id));
        break;
      case 'no_meeting':
        const clientsWithMeeting = new Set(meetings.filter(m => {
          const date = parseISO(m.meeting_date);
          return differenceInDays(now, date) <= 30;
        }).map(m => m.client_id));
        filtered = filtered.filter(a => a.status === 'active' && !clientsWithMeeting.has(a.id));
        break;
      case 'critical':
        filtered = filtered.filter(a => a.health_status === 'critical');
        break;
      case 'promoters':
        const promoterIds = npsResponses
          .filter(n => n.classification === 'promoter')
          .map(n => n.client_id);
        filtered = filtered.filter(a => promoterIds.includes(a.id));
        break;
      case 'churned':
        filtered = filtered.filter(a => a.status === 'churned' || a.status === 'canceled');
        break;
    }

    return filtered.map(a => {
      const service = services.find(s => s.id === a.service_id);
      const niche = niches.find(n => n.id === a.niche_id);
      const owner = csMembers.find(m => m.id === a.cs_member_id);
      const latestNps = npsResponses
        .filter(n => n.client_id === a.id)
        .sort((x, y) => new Date(y.created_at).getTime() - new Date(x.created_at).getTime())[0];

      return {
        id: a.id,
        name: a.name,
        status: a.status,
        healthScore: a.health_score || 100,
        healthStatus: a.health_status || 'healthy',
        lastContactAt: a.last_contact_at,
        npsScore: latestNps?.score,
        overdueTasksCount: 0,
        serviceName: service?.name,
        nicheName: niche?.name,
        state: a.state,
        city: a.city,
        ownerName: owner?.name,
        monthlyValue: a.monthly_value,
      };
    });
  }, [filteredAccounts, onboardings, npsResponses, meetings, services, niches, csMembers]);

  // States list for filter
  const availableStates = useMemo(() => {
    const states = new Set(accounts.map(a => a.state).filter(Boolean));
    return Array.from(states).sort();
  }, [accounts]);

  // Origins list for filter
  const availableOrigins = useMemo(() => {
    const origins = new Set(accounts.map(a => a.origin).filter(Boolean));
    return Array.from(origins).sort();
  }, [accounts]);

  // Cohort data for retention analysis
  const cohortData = useMemo(() => {
    const now = new Date();
    const cohorts: any[] = [];
    const maxMonthsToShow = 12;

    for (let i = 11; i >= 0; i--) {
      const cohortMonth = subMonths(now, i);
      const cohortStart = startOfMonth(cohortMonth);
      const cohortEnd = endOfMonth(cohortMonth);

      const cohortClients = accounts.filter(a => {
        if (!a.start_date) return false;
        const startDate = parseISO(a.start_date);
        return isValid(startDate) && startDate >= cohortStart && startDate <= cohortEnd;
      });

      if (cohortClients.length === 0) continue;

      const retentionRates: (number | null)[] = [];
      
      for (let m = 0; m < maxMonthsToShow; m++) {
        const targetMonth = subMonths(now, i - m);
        if (targetMonth > now) {
          retentionRates.push(null);
          continue;
        }

        const targetEnd = endOfMonth(targetMonth);
        const activeAtEnd = cohortClients.filter(a => {
          if (!a.churned_at) return true;
          const churnDate = parseISO(a.churned_at);
          return isValid(churnDate) && churnDate > targetEnd;
        }).length;

        retentionRates.push(Math.round((activeAtEnd / cohortClients.length) * 100));
      }

      cohorts.push({
        cohortMonth: format(cohortMonth, 'yyyy-MM'),
        cohortLabel: format(cohortMonth, 'MMM/yy'),
        months: retentionRates,
        totalClients: cohortClients.length,
      });
    }

    return cohorts;
  }, [accounts]);

  return {
    loading,
    filters,
    setFilters,
    dateRange,
    // Reference data
    csMembers,
    services,
    niches,
    availableStates,
    availableOrigins,
    // KPIs
    kpiData,
    onboardingFunnel,
    healthDistribution,
    npsDistribution,
    // Alerts
    alerts,
    // Churn analytics
    churnByNiche,
    churnByService,
    cohortData,
    // Playbooks
    activePlaybooks,
    // Client list
    getClientList,
    // Actions
    refetch: fetchData,
  };
}
