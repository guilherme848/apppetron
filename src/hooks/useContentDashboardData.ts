import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, subDays, format, parseISO, isAfter, isBefore, isToday, startOfMonth, endOfMonth } from 'date-fns';
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
  created_at: string;
  updated_at: string;
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

const ROLE_KEYS = ['designer', 'videomaker', 'social', 'traffic', 'support', 'cs'];

export interface ChangeRequestData {
  id: string;
  post_id: string;
  requested_at: string;
  status: string;
  resolved_at: string | null;
}

export function useContentDashboardData() {
  const [posts, setPosts] = useState<DashboardPost[]>([]);
  const [batches, setBatches] = useState<DashboardBatch[]>([]);
  const [accounts, setAccounts] = useState<DashboardAccount[]>([]);
  const [teamMembers, setTeamMembers] = useState<DashboardTeamMember[]>([]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequestData[]>([]);
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
    const [postsRes, batchesRes, accountsRes, membersRes, changeRequestsRes] = await Promise.all([
      supabase.from('content_posts').select('id, batch_id, title, status, responsible_role_key, assignee_id, started_at, completed_at, created_at, updated_at'),
      supabase.from('content_batches').select('id, client_id, month_ref, status, planning_due_date, archived, created_at').eq('archived', false),
      supabase.from('accounts').select('id, name, designer_member_id, videomaker_member_id, social_member_id, traffic_member_id, support_member_id, cs_member_id').eq('status', 'active'),
      supabase.from('team_members').select('id, name, role_id, active').eq('active', true),
      supabase.from('content_change_requests').select('id, post_id, requested_at, status, resolved_at'),
    ]);

    if (postsRes.data) setPosts(postsRes.data as DashboardPost[]);
    if (batchesRes.data) setBatches(batchesRes.data as DashboardBatch[]);
    if (accountsRes.data) setAccounts(accountsRes.data as DashboardAccount[]);
    if (membersRes.data) setTeamMembers(membersRes.data as DashboardTeamMember[]);
    if (changeRequestsRes.data) setChangeRequests(changeRequestsRes.data as ChangeRequestData[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create batch lookup
  const batchMap = useMemo(() => new Map(batches.map(b => [b.id, b])), [batches]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const memberMap = useMemo(() => new Map(teamMembers.map(m => [m.id, m])), [teamMembers]);

  // Enrich posts with batch data
  const enrichedPosts = useMemo(() => {
    return posts.map(p => {
      const batch = batchMap.get(p.batch_id);
      return {
        ...p,
        batch,
        client: batch?.client_id ? accountMap.get(batch.client_id) : null,
        assignee: p.assignee_id ? memberMap.get(p.assignee_id) : null,
      };
    }).filter(p => p.batch && !p.batch.archived); // Only include posts from non-archived batches
  }, [posts, batchMap, accountMap, memberMap]);

  // Get unique month refs
  const monthRefs = useMemo(() => {
    const refs = [...new Set(batches.map(b => b.month_ref))].sort().reverse();
    return refs;
  }, [batches]);

  // Apply filters
  const filteredPosts = useMemo(() => {
    const today = startOfDay(new Date());
    
    return enrichedPosts.filter(p => {
      // Date range filter (based on created_at or completed_at)
      if (filters.dateRange.from && filters.dateRange.to) {
        const postDate = p.completed_at ? parseISO(p.completed_at) : parseISO(p.created_at);
        if (isBefore(postDate, filters.dateRange.from) || isAfter(postDate, filters.dateRange.to)) {
          // Exception: include open posts regardless of date
          if (p.status === 'done') return false;
        }
      }

      // Month ref filter
      if (filters.monthRef && p.batch?.month_ref !== filters.monthRef) return false;

      // Client filter
      if (filters.clientId && p.batch?.client_id !== filters.clientId) return false;

      // Role key filter
      if (filters.roleKey && p.responsible_role_key !== filters.roleKey) return false;

      // Assignee filter
      if (filters.assigneeId && p.assignee_id !== filters.assigneeId) return false;

      // Batch status filter
      if (filters.batchStatus && p.batch?.status !== filters.batchStatus) return false;

      // Post status filter
      if (filters.postStatus && p.status !== filters.postStatus) return false;

      // Overdue only
      if (filters.overdueOnly) {
        const dueDate = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (!dueDate || !isBefore(dueDate, today) || p.status === 'done') return false;
      }

      // Unassigned only
      if (filters.unassignedOnly && p.assignee_id) return false;

      return true;
    });
  }, [enrichedPosts, filters]);

  // Executive metrics
  const metrics = useMemo(() => {
    const today = startOfDay(new Date());
    const { from, to } = filters.dateRange;

    // Posts completed in period
    const completedInPeriod = filteredPosts.filter(p => {
      if (p.status !== 'done' || !p.completed_at) return false;
      const completedDate = parseISO(p.completed_at);
      return !isBefore(completedDate, from) && !isAfter(completedDate, to);
    });

    // Open posts
    const openPosts = filteredPosts.filter(p => p.status !== 'done');

    // Overdue posts
    const overduePosts = filteredPosts.filter(p => {
      if (p.status === 'done') return false;
      const dueDate = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
      return dueDate && isBefore(dueDate, today);
    });

    // On time completion rate
    const completedWithDueDate = completedInPeriod.filter(p => p.batch?.planning_due_date);
    const onTimeCount = completedWithDueDate.filter(p => {
      const dueDate = parseISO(p.batch!.planning_due_date!);
      const completedDate = parseISO(p.completed_at!);
      return !isAfter(completedDate, dueDate);
    }).length;
    const onTimeRate = completedWithDueDate.length > 0 
      ? Math.round((onTimeCount / completedWithDueDate.length) * 100) 
      : 0;

    // Active batches (not done/archived)
    const activeBatches = batches.filter(b => !b.archived && b.status !== 'scheduling');

    // Overdue batches
    const overdueBatches = activeBatches.filter(b => {
      if (!b.planning_due_date) return false;
      return isBefore(parseISO(b.planning_due_date), today);
    });

    return {
      completedInPeriod: completedInPeriod.length,
      openPosts: openPosts.length,
      overduePosts: overduePosts.length,
      onTimeRate,
      activeBatches: activeBatches.length,
      overdueBatches: overdueBatches.length,
    };
  }, [filteredPosts, batches, filters.dateRange]);

  // Completed by day (for chart)
  const completedByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const { from, to } = filters.dateRange;
    
    // Initialize all days
    let current = new Date(from);
    while (!isAfter(current, to)) {
      days[format(current, 'yyyy-MM-dd')] = 0;
      current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
    }

    // Count completions
    filteredPosts.forEach(p => {
      if (p.status === 'done' && p.completed_at) {
        const day = format(parseISO(p.completed_at), 'yyyy-MM-dd');
        if (days[day] !== undefined) {
          days[day]++;
        }
      }
    });

    return Object.entries(days).map(([date, count]) => ({
      date,
      label: format(parseISO(date), 'dd/MM'),
      count,
    }));
  }, [filteredPosts, filters.dateRange]);

  // Posts by status (for stacked bar)
  const postsByStatus = useMemo(() => {
    const statusCounts = { todo: 0, doing: 0, done: 0 };
    filteredPosts.forEach(p => {
      statusCounts[p.status]++;
    });
    return [
      { status: 'A Fazer', count: statusCounts.todo, fill: 'hsl(var(--chart-1))' },
      { status: 'Fazendo', count: statusCounts.doing, fill: 'hsl(var(--chart-2))' },
      { status: 'Feito', count: statusCounts.done, fill: 'hsl(var(--chart-3))' },
    ];
  }, [filteredPosts]);

  // Batches by pipeline stage (for funnel)
  const batchesByStage = useMemo(() => {
    const stageCounts: Record<string, number> = {};
    BATCH_STATUS_OPTIONS.forEach(s => stageCounts[s.value] = 0);
    
    batches.filter(b => !b.archived).forEach(b => {
      stageCounts[b.status]++;
    });

    return BATCH_STATUS_OPTIONS.map(s => ({
      stage: s.label,
      count: stageCounts[s.value] || 0,
    }));
  }, [batches]);

  // Productivity by professional
  const productivityByProfessional = useMemo(() => {
    const today = startOfDay(new Date());
    const { from, to } = filters.dateRange;
    const stats: Record<string, {
      id: string;
      name: string;
      completedToday: number;
      completedInPeriod: number;
      wip: number;
      overdue: number;
      onTimeCount: number;
      totalWithDueDate: number;
    }> = {};

    // Initialize all team members
    teamMembers.forEach(m => {
      stats[m.id] = {
        id: m.id,
        name: m.name,
        completedToday: 0,
        completedInPeriod: 0,
        wip: 0,
        overdue: 0,
        onTimeCount: 0,
        totalWithDueDate: 0,
      };
    });

    filteredPosts.forEach(p => {
      if (!p.assignee_id) return;
      const stat = stats[p.assignee_id];
      if (!stat) return;

      if (p.status === 'done' && p.completed_at) {
        const completedDate = parseISO(p.completed_at);
        
        // Completed today
        if (isToday(completedDate)) {
          stat.completedToday++;
        }
        
        // Completed in period
        if (!isBefore(completedDate, from) && !isAfter(completedDate, to)) {
          stat.completedInPeriod++;
          
          // On time tracking
          if (p.batch?.planning_due_date) {
            stat.totalWithDueDate++;
            if (!isAfter(completedDate, parseISO(p.batch.planning_due_date))) {
              stat.onTimeCount++;
            }
          }
        }
      } else {
        // WIP
        stat.wip++;
        
        // Overdue
        const dueDate = p.batch?.planning_due_date ? parseISO(p.batch.planning_due_date) : null;
        if (dueDate && isBefore(dueDate, today)) {
          stat.overdue++;
        }
      }
    });

    return Object.values(stats)
      .filter(s => s.completedInPeriod > 0 || s.wip > 0)
      .map(s => ({
        ...s,
        onTimeRate: s.totalWithDueDate > 0 ? Math.round((s.onTimeCount / s.totalWithDueDate) * 100) : 0,
      }))
      .sort((a, b) => b.completedInPeriod - a.completedInPeriod);
  }, [filteredPosts, teamMembers, filters.dateRange]);

  // Accounts by professional by role
  const accountsByProfessionalByRole = useMemo(() => {
    const roleStats: Record<string, Record<string, { id: string; name: string; count: number; accounts: string[] }>> = {};
    
    ROLE_KEYS.forEach(role => {
      roleStats[role] = {};
    });

    accounts.forEach(acc => {
      ROLE_KEYS.forEach(role => {
        const memberId = acc[`${role}_member_id` as keyof DashboardAccount] as string | null;
        if (memberId) {
          if (!roleStats[role][memberId]) {
            const member = memberMap.get(memberId);
            roleStats[role][memberId] = {
              id: memberId,
              name: member?.name || 'Desconhecido',
              count: 0,
              accounts: [],
            };
          }
          roleStats[role][memberId].count++;
          roleStats[role][memberId].accounts.push(acc.name);
        }
      });
    });

    return ROLE_KEYS.map(role => ({
      role,
      label: role.charAt(0).toUpperCase() + role.slice(1),
      professionals: Object.values(roleStats[role]).sort((a, b) => b.count - a.count),
    }));
  }, [accounts, memberMap]);

  // Batch progress for table
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
          id: b.id,
          clientName: client?.name || 'Sem cliente',
          monthRef: b.month_ref,
          status: b.status,
          statusLabel: BATCH_STATUS_OPTIONS.find(s => s.value === b.status)?.label || b.status,
          planningDueDate: b.planning_due_date,
          done: donePosts,
          total: totalPosts,
          progress,
          isOverdue,
          risk: isOverdue ? 'high' : progress < 50 && dueDate && isBefore(dueDate, new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) ? 'medium' : 'low',
        };
      })
      .sort((a, b) => {
        // Sort by risk first, then by due date
        if (a.risk !== b.risk) {
          const riskOrder = { high: 0, medium: 1, low: 2 };
          return riskOrder[a.risk] - riskOrder[b.risk];
        }
        if (a.planningDueDate && b.planningDueDate) {
          return new Date(a.planningDueDate).getTime() - new Date(b.planningDueDate).getTime();
        }
        return 0;
      });
  }, [batches, posts, accountMap]);

  // Post report data
  const postReport = useMemo(() => {
    return filteredPosts.map(p => ({
      id: p.id,
      title: p.title,
      clientName: p.client?.name || 'Sem cliente',
      monthRef: p.batch?.month_ref || '',
      status: p.status,
      roleKey: p.responsible_role_key || '',
      assigneeName: p.assignee?.name || '',
      dueDate: p.batch?.planning_due_date || null,
      completedAt: p.completed_at,
      updatedAt: p.updated_at,
      batchId: p.batch_id,
    }));
  }, [filteredPosts]);

  // Change request metrics
  const changeRequestMetrics = useMemo(() => {
    const postIdSet = new Set(filteredPosts.map(p => p.id));
    const relevantRequests = changeRequests.filter(cr => postIdSet.has(cr.post_id));
    
    const postsWithChanges = new Set(relevantRequests.map(cr => cr.post_id)).size;
    const totalPosts = filteredPosts.length;
    const reworkRate = totalPosts > 0 ? (postsWithChanges / totalPosts) * 100 : 0;
    
    const resolvedRequests = relevantRequests.filter(cr => cr.status === 'done' && cr.resolved_at);
    const avgResolutionMs = resolvedRequests.length > 0
      ? resolvedRequests.reduce((sum, cr) => {
          const diff = new Date(cr.resolved_at!).getTime() - new Date(cr.requested_at).getTime();
          return sum + diff;
        }, 0) / resolvedRequests.length
      : 0;
    const avgResolutionHours = avgResolutionMs / (1000 * 60 * 60);
    
    return {
      totalRequests: relevantRequests.length,
      openRequests: relevantRequests.filter(cr => cr.status === 'open' || cr.status === 'in_progress').length,
      postsWithChanges,
      reworkRate,
      avgResolutionHours,
    };
  }, [filteredPosts, changeRequests]);

  return {
    loading,
    filters,
    setFilters,
    updateFilter: <K extends keyof DashboardFilters>(key: K, value: DashboardFilters[K]) => {
      setFilters(prev => ({ ...prev, [key]: value }));
    },
    // Data
    posts: filteredPosts,
    batches,
    accounts,
    teamMembers,
    monthRefs,
    changeRequests,
    // Metrics
    metrics,
    completedByDay,
    postsByStatus,
    batchesByStage,
    productivityByProfessional,
    accountsByProfessionalByRole,
    batchProgress,
    postReport,
    changeRequestMetrics,
    // Actions
    refetch: fetchData,
  };
}
