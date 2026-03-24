import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  startOfDay, subDays, format, parseISO, isAfter, isBefore, isToday,
  startOfMonth, endOfMonth, differenceInBusinessDays, startOfWeek, endOfWeek,
  subWeeks, differenceInDays, getDate, getDaysInMonth, addWeeks, isWithinInterval,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BatchStatus, PostStatus, BATCH_STATUS_OPTIONS } from '@/types/contentProduction';

export interface DashboardPost {
  id: string;
  batch_id: string;
  title: string;
  status: PostStatus;
  responsible_role_key: string | null;
  assignee_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  data_conclusao: string | null;
  created_at: string;
  updated_at: string;
  due_date: string | null;
}

export interface DashboardBatch {
  id: string;
  client_id: string | null;
  month_ref: string;
  status: BatchStatus;
  planning_due_date: string | null;
  archived: boolean;
  created_at: string;
}

export interface DashboardAccount {
  id: string;
  name: string;
  designer_member_id: string | null;
  videomaker_member_id: string | null;
  social_member_id: string | null;
  traffic_member_id: string | null;
  support_member_id: string | null;
  cs_member_id: string | null;
}

export interface DashboardTeamMember {
  id: string;
  name: string;
  role_id: string | null;
  active: boolean;
}

export interface DashboardFilters {
  dateRange: { from: Date; to: Date };
  monthRef: string;
  clientId: string;
  roleKey: string;
  assigneeId: string;
  batchStatus: string;
  postStatus: string;
  overdueOnly: boolean;
  unassignedOnly: boolean;
}

export interface MetaProducaoDiaria {
  id: string;
  cargo: string;
  meta_diaria: number;
  ativo: boolean;
}

export interface ChangeRequestData {
  id: string;
  post_id: string;
  requested_at: string;
  status: string;
  resolved_at: string | null;
}

const ROLE_KEYS = ['designer', 'videomaker', 'social', 'traffic', 'support', 'cs'];

export function useContentDashboardData() {
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [batches, setBatches] = useState<DashboardBatch[]>([]);
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [teamMembers, setTeamMembers] = useState<DashboardTeamMember[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestData[]>([]);
  const [metas, setMetas] = useState<MetaProducaoDiaria[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<DashboardFilters>({
    dateRange: { from: subDays(new Date(), 30), to: new Date() },
    monthRef: '',
    clientId: '',
    roleKey: '',
    assigneeId: '',
    batchStatus: '',
    postStatus: '',
    overdueOnly: false,
    unassignedOnly: false,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [postsRes, batchesRes, accountsRes, membersRes, changeRequestsRes, metasRes] = await Promise.all([
      supabase.from('content_posts').select('id, batch_id, title, status, responsible_role_key, assignee_id, started_at, completed_at, data_conclusao, created_at, updated_at, due_date'),
      supabase.from('content_batches').select('id, client_id, month_ref, status, planning_due_date, archived, created_at').eq('archived', false),
      supabase.from('accounts').select('id, name, designer_member_id, videomaker_member_id, social_member_id, traffic_member_id, support_member_id, cs_member_id').eq('status', 'active'),
      supabase.from('team_members').select('id, name, role_id, active').eq('active', true),
      supabase.from('content_change_requests').select('id, post_id, requested_at, status, resolved_at'),
      supabase.from('metas_producao_diaria').select('id, cargo, meta_diaria, ativo').eq('ativo', true),
    ]);

    if (postsRes.data) setPosts(postsRes.data as DashboardPost[]);
    if (batchesRes.data) setBatches(batchesRes.data as DashboardBatch[]);
    if (accountsRes.data) setAccounts(accountsRes.data as DashboardAccount[]);
    if (membersRes.data) setTeamMembers(membersRes.data as DashboardTeamMember[]);
    if (changeRequestsRes.data) setChangeRequests(changeRequestsRes.data as ChangeRequestData[]);
    if (metasRes.data) setMetas(metasRes.data as MetaProducaoDiaria[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const batchMap = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  const metasMap = useMemo(() => {
    const map: Record<string, number> = {};
    metas.forEach(m => { map[m.cargo] = m.meta_diaria; });
    return map;
  }, [metas]);

  const enrichedPosts = useMemo(() => {
    return posts.map(p => {
      const batch = batchMap.get(p.batch_id);
      return {
        ...p,
        batch,
        client: batch?.client_id ? accountMap.get(batch.client_id) : null,
        assignee: p.assignee_id ? memberMap.get(p.assignee_id) : null,
      };
    }).filter(p => p.batch && !p.batch.archived);
  }, [posts, batchMap, accountMap, memberMap]);

  const monthRefs = useMemo(() => [...new Set(batches.map(b => b.month_ref))].sort().reverse(), [batches]);

  const filteredPosts = useMemo(() => {
    const today = startOfDay(new Date());
    return enrichedPosts.filter(p => {
      if (filters.dateRange.from && filters.dateRange.to) {
        const postDate = p.data_conclusao ? parseISO(p.data_conclusao) : p.completed_at ? parseISO(p.completed_at) : parseISO(p.created_at);
        if (isBefore(postDate, filters.dateRange.from) || isAfter(postDate, filters.dateRange.to)) {
          if (p.status === 'done') return false;
        }
      }
      if (filters.monthRef && p.batch?.month_ref !== filters.monthRef) return false;
      if (filters.clientId && p.batch?.client_id !== filters.clientId) return false;
      if (filters.roleKey && p.responsible_role_key !== filters.roleKey) return false;
      if (filters.assigneeId && p.assignee_id !== filters.assigneeId) return false;
      if (filters.batchStatus && p.batch?.status !== filters.batchStatus) return false;
      if (filters.postStatus && p.status !== filters.postStatus) return false;
      if (filters.overdueOnly) {
        const dueDate = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (!dueDate || !isBefore(dueDate, today) || p.status === 'done') return false;
      }
      if (filters.unassignedOnly && p.assignee_id) return false;
      return true;
    });
  }, [enrichedPosts, filters]);

  // ── KPI metrics ──
  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const { from, to } = filters.dateRange;

    const completedInPeriod = filteredPosts.filter(p => {
      if (p.status !== 'done') return false;
      const completedDate = p.data_conclusao ? parseISO(p.data_conclusao) : p.completed_at ? parseISO(p.completed_at) : null;
      if (!completedDate) return false;
      return !isBefore(completedDate, from) && !isAfter(completedDate, to);
    });

    const inProgress = filteredPosts.filter(p => p.status === 'doing');
    const openPosts = filteredPosts.filter(p => p.status !== 'done');

    const overduePosts = filteredPosts.filter(p => {
      if (p.status === 'done') return false;
      const dueDate = p.due_date ? parseISO(p.due_date) : p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      return dueDate && isBefore(dueDate, today) && !p.data_conclusao;
    });

    const completedWithDueDate = completedInPeriod.filter(p => p.due_date || p.batch?.planning_due_date);
    const onTimeCount = completedWithDueDate.filter(p => {
      const dueDate = p.due_date ? parseISO(p.due_date) : parseISO(p.batch!.planning_due_date!);
      const completedDate = p.data_conclusao ? parseISO(p.data_conclusao) : parseISO(p.completed_at!);
      return !isAfter(completedDate, dueDate);
    }).length;
    const onTimeRate = completedWithDueDate.length > 0
      ? Math.round((onTimeCount / completedWithDueDate.length) * 100) : 0;

    const activeBatches = batches.filter(b => !b.archived && b.status !== 'scheduling');
    const overdueBatches = activeBatches.filter(b => {
      if (!b.planning_due_date) return false;
      return isBefore(parseISO(b.planning_due_date), today);
    });

    // Change request metrics
    const postIdSet = new Set(filteredPosts.map(p => p.id));
    const relevantCRs = changeRequests.filter(cr => postIdSet.has(cr.post_id));
    const postsWithChanges = new Set(relevantCRs.map(cr => cr.post_id)).size;
    const reworkCount = postsWithChanges;
    const reworkRate = completedInPeriod.length > 0 ? Math.round((reworkCount / completedInPeriod.length) * 100 * 10) / 10 : 0;
    const netDeliveries = completedInPeriod.length - reworkCount;

    // Production time
    const productionTimes = completedInPeriod
      .filter(p => p.created_at && (p.data_conclusao || p.completed_at))
      .map(p => {
        const start = parseISO(p.created_at);
        const end = p.data_conclusao ? parseISO(p.data_conclusao) : parseISO(p.completed_at!);
        return Math.max(differenceInDays(end, start), 0);
      });
    const avgProductionTime = productionTimes.length > 0
      ? Math.round((productionTimes.reduce((s, v) => s + v, 0) / productionTimes.length) * 10) / 10 : 0;
    const minProductionTime = productionTimes.length > 0 ? Math.min(...productionTimes) : 0;
    const maxProductionTime = productionTimes.length > 0 ? Math.max(...productionTimes) : 0;

    // Team capacity
    const businessDaysInMonth = Math.max(differenceInBusinessDays(endOfMonth(today), startOfMonth(today)), 1);
    const productionRoles = ['designer', 'videomaker', 'social'];
    const uniqueAssignees = new Set<string>();
    filteredPosts.forEach(p => {
      if (p.assignee_id && p.responsible_role_key && productionRoles.includes(p.responsible_role_key)) {
        uniqueAssignees.add(`${p.assignee_id}-${p.responsible_role_key}`);
      }
    });

    let totalCapacity = 0;
    uniqueAssignees.forEach(key => {
      const role = key.split('-').pop()!;
      totalCapacity += (metasMap[role] || 0) * businessDaysInMonth;
    });

    const committed = filteredPosts.filter(p =>
      p.status !== 'done' && p.assignee_id && p.responsible_role_key && productionRoles.includes(p.responsible_role_key)
    ).length;
    const available = Math.max(totalCapacity - committed, 0);
    const occupancyPct = totalCapacity > 0 ? Math.round((committed / totalCapacity) * 100) : 0;

    return {
      completedInPeriod: completedInPeriod.length,
      inProgress: inProgress.length,
      openPosts: openPosts.length,
      overduePosts: overduePosts.length,
      onTimeRate,
      activeBatches: activeBatches.length,
      overdueBatches: overdueBatches.length,
      reworkCount,
      reworkRate,
      netDeliveries,
      avgProductionTime,
      minProductionTime,
      maxProductionTime,
      totalCapacity,
      committed,
      available,
      occupancyPct,
    };
  }, [filteredPosts, batches, filters.dateRange, changeRequests, metasMap]);

  // ── Completed by day ──
  const completedByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const { from, to } = filters.dateRange;
    let current = new Date(from);
    while (!isAfter(current, to)) {
      days[format(current, 'yyyy-MM-dd')] = 0;
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }
    filteredPosts.forEach(p => {
      if (p.status === 'done') {
        const dateStr = p.data_conclusao || p.completed_at;
        if (dateStr) {
          const day = format(parseISO(dateStr), 'yyyy-MM-dd');
          if (days[day] !== undefined) days[day]++;
        }
      }
    });
    return Object.entries(days).map(([date, count]) => ({
      date, label: format(parseISO(date), 'dd/MM'), count,
    }));
  }, [filteredPosts, filters.dateRange]);

  // ── Posts by status ──
  const postsByStatus = useMemo(() => {
    const statusCounts = { todo: 0, doing: 0, done: 0 };
    filteredPosts.forEach(p => { statusCounts[p.status]++; });
    return [
      { status: 'A Fazer', count: statusCounts.todo, fill: 'hsl(var(--chart-1))' },
      { status: 'Fazendo', count: statusCounts.doing, fill: 'hsl(var(--chart-2))' },
      { status: 'Feito', count: statusCounts.done, fill: 'hsl(var(--chart-3))' },
    ];
  }, [filteredPosts]);

  // ── Batches by stage ──
  const batchesByStage = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    BATCH_STATUS_OPTIONS.forEach(s => stageCounts[s.value] = 0);
    batches.filter(b => !b.archived).forEach(b => { stageCounts[b.status]++; });
    return BATCH_STATUS_OPTIONS.map(s => ({ stage: s.label, count: stageCounts[s.value] || 0 }));
  }, [batches]);

  // ── Productivity by professional ──
  const productivityByProfessional = useMemo(() => {
    const today = startOfDay(new Date());
    const { from, to } = filters.dateRange;
    const changePostIds = new Set(changeRequests.map(cr => cr.post_id));
    const stats: Record<string, {
      id: string; name: string; role: string;
      completedInPeriod: number; completedToday: number; wip: number; overdue: number;
      onTimeCount: number; totalWithDueDate: number;
      postsWithChanges: number; dailyCounts: Record<number, number>;
      productionTimes: number[];
    }> = {};

    filteredPosts.forEach(p => {
      if (!p.assignee_id || !p.responsible_role_key) return;
      if (!['designer', 'videomaker', 'social'].includes(p.responsible_role_key)) return;

      const key = `${p.assignee_id}-${p.responsible_role_key}`;
      if (!stats[key]) {
        stats[key] = {
          id: p.assignee_id, name: p.assignee?.name || 'Desconhecido', role: p.responsible_role_key,
          completedInPeriod: 0, completedToday: 0, wip: 0, overdue: 0,
          onTimeCount: 0, totalWithDueDate: 0, postsWithChanges: 0,
          dailyCounts: {}, productionTimes: [],
        };
      }
      const s = stats[key];

      if (p.status === 'done') {
        const dateStr = p.data_conclusao || p.completed_at;
        if (dateStr && typeof dateStr === 'string') {
          const cd = parseISO(dateStr);
          if (isToday(cd)) s.completedToday++;
          if (!isBefore(cd, from) && !isAfter(cd, to)) {
            s.completedInPeriod++;
            if (changePostIds.has(p.id)) s.postsWithChanges++;
            const day = getDate(cd);
            s.dailyCounts[day] = (s.dailyCounts[day] || 0) + 1;
            if (p.due_date || p.batch?.planning_due_date) {
              s.totalWithDueDate++;
              const dueDateStr = p.due_date || p.batch!.planning_due_date!;
              if (typeof dueDateStr === 'string') {
                const dueDate = parseISO(dueDateStr);
                if (!isAfter(cd, dueDate)) s.onTimeCount++;
              }
            }
            // production time
            if (typeof p.created_at === 'string') {
              const created = parseISO(p.created_at);
              const prodTime = Math.max(differenceInDays(cd, created), 0);
              s.productionTimes.push(prodTime);
            }
          }
        }
      } else {
        s.wip++;
        const dueDateStr = p.due_date || p.batch?.planning_due_date;
        if (dueDateStr && typeof dueDateStr === 'string') {
          const dueDate = parseISO(dueDateStr);
          if (isBefore(dueDate, today)) s.overdue++;
        }
      }
    });

    const businessDays = Math.max(differenceInBusinessDays(filters.dateRange.to, filters.dateRange.from), 1);
    const businessDaysInMonth = Math.max(differenceInBusinessDays(endOfMonth(new Date()), startOfMonth(new Date())), 1);

    const thisWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const thisWeekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    const lastWeekStart = subWeeks(thisWeekStart, 1);
    const lastWeekEnd = subWeeks(thisWeekEnd, 1);

    return Object.values(stats)
      .filter(s => s.completedInPeriod > 0 || s.wip > 0)
      .map(s => {
        const meta = metasMap[s.role] || 0;
        const avgPerDay = Math.round((s.completedInPeriod / businessDays) * 10) / 10;
        const avgProdTime = s.productionTimes.length > 0
          ? Math.round((s.productionTimes.reduce((a, b) => a + b, 0) / s.productionTimes.length) * 10) / 10 : 0;
        const punctuality = s.totalWithDueDate > 0 ? Math.round((s.onTimeCount / s.totalWithDueDate) * 100) : 0;
        const changeRate = s.completedInPeriod > 0 ? Math.round((s.postsWithChanges / s.completedInPeriod) * 100) : 0;
        const netDeliveries = s.completedInPeriod - s.postsWithChanges;
        const capacityMonthly = meta * businessDaysInMonth;
        const committed = s.wip;
        const availableCapacity = Math.max(capacityMonthly - committed, 0);
        const occupancyPct = capacityMonthly > 0 ? Math.round((committed / capacityMonthly) * 100) : 0;

        // Weekly trend
        let thisWeekCount = 0;
        let lastWeekCount = 0;
        filteredPosts.forEach(p => {
          if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
          if (p.status !== 'done') return;
          const ds = p.data_conclusao || p.completed_at;
          if (!ds) return;
          const cd = parseISO(ds);
          if (!isBefore(cd, thisWeekStart) && !isAfter(cd, thisWeekEnd)) thisWeekCount++;
          if (!isBefore(cd, lastWeekStart) && !isAfter(cd, lastWeekEnd)) lastWeekCount++;
        });
        const trendPct = lastWeekCount > 0
          ? Math.round(((thisWeekCount / 5 - lastWeekCount / 5) / (lastWeekCount / 5)) * 100)
          : thisWeekCount > 0 ? 100 : 0;

        // Best day
        let bestDay = { day: 0, count: 0 };
        Object.entries(s.dailyCounts).forEach(([d, c]) => {
          if (c > bestDay.count) bestDay = { day: Number(d), count: c };
        });

        // ── Sparkline: last 6 months avg/day ──
        const monthlyHistory: { month: string; label: string; avgPerDay: number }[] = [];
        for (let mi = 5; mi >= 0; mi--) {
          const mDate = subMonths(new Date(), mi);
          const mStart = startOfMonth(mDate);
          const mEnd = endOfMonth(mDate);
          const mBizDays = Math.max(differenceInBusinessDays(mEnd, mStart), 1);
          let mCount = 0;
          enrichedPosts.forEach(p => {
            if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
            if (p.status !== 'done') return;
            const ds = p.data_conclusao || p.completed_at;
            if (!ds) return;
            const cd = parseISO(ds);
            if (!isBefore(cd, mStart) && !isAfter(cd, mEnd)) mCount++;
          });
          monthlyHistory.push({
            month: format(mDate, 'yyyy-MM'),
            label: format(mDate, 'MMM', { locale: ptBR }).replace('.', ''),
            avgPerDay: mCount > 0 ? Math.round((mCount / mBizDays) * 10) / 10 : 0,
          });
        }
        // Sparkline trend: avg of last 2 months vs avg of 2 months before
        const recent2 = monthlyHistory.slice(-2);
        const prev2 = monthlyHistory.slice(-4, -2);
        const recentAvg = recent2.length > 0 ? recent2.reduce((a, b) => a + b.avgPerDay, 0) / recent2.length : 0;
        const prevAvg = prev2.length > 0 ? prev2.reduce((a, b) => a + b.avgPerDay, 0) / prev2.length : 0;
        const sparklineTrend = prevAvg > 0
          ? Math.round(((recentAvg - prevAvg) / prevAvg) * 100)
          : recentAvg > 0 ? 100 : 0;
        const monthsWithData = monthlyHistory.filter(m => m.avgPerDay > 0).length;

        // ── Client distribution ──
        const clientStats: Record<string, { name: string; delivered: number; pending: number }> = {};
        filteredPosts.forEach(p => {
          if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
          const clientName = p.client?.name || 'Sem cliente';
          if (!clientStats[clientName]) clientStats[clientName] = { name: clientName, delivered: 0, pending: 0 };
          if (p.status === 'done') {
            const ds = p.data_conclusao || p.completed_at;
            if (ds) {
              const cd = parseISO(ds);
              if (!isBefore(cd, from) && !isAfter(cd, to)) clientStats[clientName].delivered++;
            }
          } else {
            clientStats[clientName].pending++;
          }
        });
        const clientDistribution = Object.values(clientStats)
          .filter(c => c.delivered > 0 || c.pending > 0)
          .sort((a, b) => b.delivered - a.delivered);
        const totalClientDeliveries = clientDistribution.reduce((sum, c) => sum + c.delivered, 0);
        const topClientPct = totalClientDeliveries > 0 && clientDistribution.length > 0
          ? Math.round((clientDistribution[0].delivered / totalClientDeliveries) * 100) : 0;

        // ── Monthly projection ──
        const currentMonthStart = startOfMonth(today);
        const currentMonthEnd = endOfMonth(today);
        const totalBizDaysMonth = Math.max(differenceInBusinessDays(currentMonthEnd, currentMonthStart), 1);
        const elapsedBizDays = Math.max(differenceInBusinessDays(today, currentMonthStart), 1);
        let deliveriesThisMonth = 0;
        enrichedPosts.forEach(p => {
          if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
          if (p.status !== 'done') return;
          const ds = p.data_conclusao || p.completed_at;
          if (!ds) return;
          const cd = parseISO(ds);
          if (!isBefore(cd, currentMonthStart) && !isAfter(cd, currentMonthEnd)) deliveriesThisMonth++;
        });
        const currentVelocity = deliveriesThisMonth / elapsedBizDays;
        const remainingBizDays = Math.max(totalBizDaysMonth - elapsedBizDays, 0);
        const projectedTotal = Math.round(deliveriesThisMonth + currentVelocity * remainingBizDays);
        const monthlyGoal = meta * totalBizDaysMonth;
        const projectionDiff = projectedTotal - monthlyGoal;
        const projectionPct = monthlyGoal > 0 ? Math.round((projectedTotal / monthlyGoal) * 100) : 0;
        const alreadyMetGoal = deliveriesThisMonth >= monthlyGoal;
        const isCurrentMonth = format(filters.dateRange.from, 'yyyy-MM') === format(today, 'yyyy-MM')
          || format(filters.dateRange.to, 'yyyy-MM') === format(today, 'yyyy-MM');

        return {
          id: s.id, name: s.name, role: s.role,
          completedInPeriod: s.completedInPeriod,
          completedToday: s.completedToday,
          thisWeekCount,
          thisMonthCount: s.completedInPeriod,
          wip: s.wip, overdue: s.overdue,
          avgPerDay, meta, trendPct,
          avgProdTime, punctuality, changeRate,
          netDeliveries, postsWithChanges: s.postsWithChanges,
          capacityMonthly, committed, availableCapacity, occupancyPct,
          bestDay, dailyCounts: s.dailyCounts,
          businessDays,
          // New: sparkline
          monthlyHistory, sparklineTrend, monthsWithData,
          // New: client distribution
          clientDistribution, totalClientDeliveries, topClientPct,
          // New: projection
          deliveriesThisMonth, projectedTotal, monthlyGoal,
          projectionDiff, projectionPct, alreadyMetGoal,
          remainingBizDays, elapsedBizDays, totalBizDaysMonth, isCurrentMonth,
        };
      })
      .sort((a, b) => {
        const roleOrder = ['designer', 'videomaker', 'social'];
        const ra = roleOrder.indexOf(a.role);
        const rb = roleOrder.indexOf(b.role);
        if (ra !== rb) return ra - rb;
        return b.netDeliveries - a.netDeliveries;
      });
  }, [filteredPosts, enrichedPosts, changeRequests, filters.dateRange, metasMap]);

  // ── Alerts ──
  const productionAlerts = useMemo(() => {
    const alerts: { id: string; name: string; role: string; description: string; severity: 'high' | 'medium' }[] = [];
    productivityByProfessional.forEach(p => {
      if (p.overdue > 3) {
        alerts.push({ id: `${p.id}-overdue`, name: p.name, role: p.role, description: `${p.overdue} atrasados`, severity: 'high' });
      }
      if (p.meta > 0 && p.avgPerDay < p.meta * 0.7) {
        alerts.push({ id: `${p.id}-lowprod`, name: p.name, role: p.role, description: `Abaixo de 70% da meta (${p.avgPerDay}/${p.meta})`, severity: 'medium' });
      }
      if (p.occupancyPct > 90) {
        alerts.push({ id: `${p.id}-capacity`, name: p.name, role: p.role, description: `Capacidade esgotada (${p.occupancyPct}%)`, severity: 'high' });
      }
      if (p.changeRate > 15) {
        alerts.push({ id: `${p.id}-rework`, name: p.name, role: p.role, description: `Taxa de retrabalho ${p.changeRate}%`, severity: 'medium' });
      }
    });
    return alerts;
  }, [productivityByProfessional]);

  // ── Weekly chart data ──
  const weeklyChartData = useMemo(() => {
    const today = startOfDay(new Date());
    const monthStart2 = startOfMonth(today);
    const weeks: { label: string; start: Date; end: Date }[] = [];
    let ws = startOfWeek(monthStart2, { locale: ptBR });
    for (let i = 0; i < 5; i++) {
      const we = endOfWeek(ws, { locale: ptBR });
      weeks.push({ label: `Sem ${i + 1}`, start: ws, end: we });
      ws = addWeeks(ws, 1);
    }

    const allProfs = productivityByProfessional;
    return weeks.map(w => {
      const row: any = { week: w.label };
      allProfs.forEach(s => {
        let count = 0;
        filteredPosts.forEach(p => {
          if (p.assignee_id !== s.id || p.responsible_role_key !== s.role) return;
          if (p.status !== 'done') return;
          const ds = p.data_conclusao || p.completed_at;
          if (!ds) return;
          const cd = parseISO(ds);
          if (isWithinInterval(cd, { start: w.start, end: w.end })) count++;
        });
        row[`${s.name}_${s.role}`] = count;
      });
      return row;
    });
  }, [productivityByProfessional, filteredPosts]);

  // ── Batch progress ──
  const batchProgress = useMemo(() => {
    const today = startOfDay(new Date());
    return batches
      .filter(b => !b.archived)
      .map(b => {
        const batchPosts = posts.filter(p => p.batch_id === b.id);
        const donePosts = batchPosts.filter(p => p.status === 'done').length;
        const totalPosts = batchPosts.length;
        const progress = totalPosts > 0 ? Math.round((donePosts / totalPosts) * 100) : 0;
        const dueDate = b.planning_due_date ? parseISO(b.planning_due_date) : null;
        const isOverdue = dueDate && isBefore(dueDate, today) && progress < 100;
        const client = b.client_id ? accountMap.get(b.client_id) : null;
        return {
          id: b.id, clientName: client?.name || 'Sem cliente', monthRef: b.month_ref,
          status: b.status, statusLabel: BATCH_STATUS_OPTIONS.find(s => s.value === b.status)?.label || b.status,
          planningDueDate: b.planning_due_date, done: donePosts, total: totalPosts, progress, isOverdue,
          risk: isOverdue ? 'high' as const : progress < 50 && dueDate && isBefore(dueDate, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) ? 'medium' as const : 'low' as const,
        };
      })
      .sort((a, b) => {
        if (a.risk !== b.risk) return ({ high: 0, medium: 1, low: 2 })[a.risk] - ({ high: 0, medium: 1, low: 2 })[b.risk];
        if (a.planningDueDate && b.planningDueDate) return new Date(a.planningDueDate).getTime() - new Date(b.planningDueDate).getTime();
        return 0;
      });
  }, [batches, posts, accountMap]);

  // ── Accounts by professional by role ──
  const accountsByProfessionalByRole = useMemo(() => {
    const roleStats: Record<string, Record<string, { id: string; name: string; count: number; accounts: string[] }>> = {};
    ROLE_KEYS.forEach(role => { roleStats[role] = {}; });
    accounts.forEach(acc => {
      ROLE_KEYS.forEach(role => {
        const memberId = acc[`${role}_member_id` as keyof DashboardAccount] as string | null;
        if (memberId) {
          if (!roleStats[role][memberId]) {
            const member = memberMap.get(memberId);
            roleStats[role][memberId] = { id: memberId, name: member?.name || 'Desconhecido', count: 0, accounts: [] };
          }
          roleStats[role][memberId].count++;
          roleStats[role][memberId].accounts.push(acc.name);
        }
      });
    });
    return ROLE_KEYS.map(role => ({
      role, label: role.charAt(0).toUpperCase() + role.slice(1),
      professionals: Object.values(roleStats[role]).sort((a, b) => b.count - a.count),
    }));
  }, [accounts, memberMap]);

  // ── Change request metrics for Alterações tab ──
  const changeRequestMetrics = useMemo(() => {
    const postIdSet = new Set(filteredPosts.map(p => p.id));
    const relevantRequests = changeRequests.filter(cr => postIdSet.has(cr.post_id));
    const postsWithChanges = new Set(relevantRequests.map(cr => cr.post_id)).size;
    const totalPosts = filteredPosts.length;
    const reworkRate = totalPosts > 0 ? (postsWithChanges / totalPosts) * 100 : 0;
    return {
      totalRequests: relevantRequests.length,
      openRequests: relevantRequests.filter(cr => cr.status === 'open' || cr.status === 'in_progress').length,
      postsWithChanges, reworkRate,
    };
  }, [filteredPosts, changeRequests]);

  return {
    loading,
    filters,
    setFilters,
    updateFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    posts: filteredPosts,
    batches,
    accounts,
    teamMembers,
    monthRefs,
    changeRequests,
    metas,
    metasMap,
    metrics,
    completedByDay,
    postsByStatus,
    batchesByStage,
    productivityByProfessional,
    productionAlerts,
    weeklyChartData,
    accountsByProfessionalByRole,
    batchProgress,
    changeRequestMetrics,
    refetch: fetchData,
  };
}
