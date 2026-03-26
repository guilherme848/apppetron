 import { useState, useEffect, useMemo, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import { TrafficPlaybookTask, TrafficCadence, WORKLOAD_WEIGHTS, TrafficBlockedReason } from '@/types/trafficPlaybook';
 import { parseISO, isToday, isPast, isFuture, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
 
 interface Account {
   id: string;
   name: string;
   service_id: string | null;
   traffic_member_id: string | null;
 }
 
 interface TeamMember {
   id: string;
   name: string;
 }
 
 interface Service {
   id: string;
   name: string;
 }
 
 interface ClientStatus {
   client_id: string;
   campaign_status: string;
   weekly_workday: number;
   weekly_workday_locked: boolean;
 }
 
 export interface ManagerWorkload {
   id: string;
   name: string;
   openTasks: number;
   overdueTasks: number;
   todayTasks: number;
   blockedTasks: number;
   workloadScore: number;
 }
 
 export interface DaySchedule {
   date: string;
   weekday: number;
   tasks: TrafficPlaybookTask[];
   totalScore: number;
   byManager: Record<string, TrafficPlaybookTask[]>;
 }
 
 export interface BlockedBreakdown {
   reason: TrafficBlockedReason;
   count: number;
   clients: { id: string; name: string; days: number }[];
 }
 
 export interface Filters {
   period: string;
   managerId: string;
   serviceId: string;
   campaignStatus: string;
   cadence: string;
   taskStatus: string;
 }
 
 export function useTrafficOperationalDashboard() {
   const [tasks, setTasks] = useState<TrafficPlaybookTask[]>([]);
   const [accounts, setAccounts] = useState<Account[]>([]);
   const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
   const [services, setServices] = useState<Service[]>([]);
   const [clientStatuses, setClientStatuses] = useState<ClientStatus[]>([]);
   const [loading, setLoading] = useState(true);
   const [filters, setFilters] = useState<Filters>({
     period: 'week',
     managerId: 'all',
     serviceId: 'all',
     campaignStatus: 'all',
     cadence: 'all',
     taskStatus: 'pending',
   });
 
   const fetchData = useCallback(async () => {
     setLoading(true);
     try {
       const [tasksRes, accountsRes, membersRes, servicesRes, statusesRes] = await Promise.all([
         supabase.from('traffic_playbook_tasks').select('*').order('due_date'),
         supabase.from('accounts').select('id, name, service_id, traffic_member_id').is('deleted_at', null).or('cliente_interno.is.null,cliente_interno.eq.false'),
         supabase.from('team_members').select('id, name'),
         supabase.from('services').select('id, name'),
         supabase.from('traffic_client_status').select('*'),
       ]);
 
       if (tasksRes.data) setTasks(tasksRes.data as unknown as TrafficPlaybookTask[]);
       if (accountsRes.data) setAccounts(accountsRes.data);
       if (membersRes.data) setTeamMembers(membersRes.data);
       if (servicesRes.data) setServices(servicesRes.data);
       if (statusesRes.data) setClientStatuses(statusesRes.data as ClientStatus[]);
     } finally {
       setLoading(false);
     }
   }, []);
 
   useEffect(() => { fetchData(); }, [fetchData]);
 
   // Get date range based on period filter
   const getDateRange = useCallback(() => {
     const today = new Date();
     switch (filters.period) {
       case 'today':
         return { start: today, end: today };
       case 'week':
         return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
       case 'next7':
         return { start: today, end: addDays(today, 7) };
       case 'next14':
         return { start: today, end: addDays(today, 14) };
       case 'month':
         return { start: startOfMonth(today), end: endOfMonth(today) };
       default:
         return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
     }
   }, [filters.period]);
 
   // Filter tasks based on all filters
   const filteredTasks = useMemo(() => {
     const { start, end } = getDateRange();
     const startStr = start.toISOString().split('T')[0];
     const endStr = end.toISOString().split('T')[0];
 
     return tasks.filter(task => {
       // Period filter (include overdue for pending)
       const dueDate = task.due_date;
       const isOverdue = task.status !== 'done' && task.status !== 'skipped' && dueDate < startStr;
       if (filters.taskStatus === 'pending' && !isOverdue && (dueDate < startStr || dueDate > endStr)) return false;
       if (filters.taskStatus !== 'pending' && (dueDate < startStr || dueDate > endStr)) return false;
 
       // Manager filter
       if (filters.managerId !== 'all' && task.assigned_to !== filters.managerId) return false;
 
       // Service filter
       if (filters.serviceId !== 'all') {
         const account = accounts.find(a => a.id === task.client_id);
         if (account?.service_id !== filters.serviceId) return false;
       }
 
       // Campaign status filter
       if (filters.campaignStatus !== 'all') {
         const status = clientStatuses.find(s => s.client_id === task.client_id);
         if (status?.campaign_status !== filters.campaignStatus) return false;
       }
 
       // Cadence filter
       if (filters.cadence !== 'all' && task.cadence !== filters.cadence) return false;
 
       // Task status filter
       if (filters.taskStatus === 'pending' && (task.status === 'done' || task.status === 'skipped')) return false;
       if (filters.taskStatus !== 'all' && filters.taskStatus !== 'pending' && task.status !== filters.taskStatus) return false;
 
       return true;
     });
   }, [tasks, filters, accounts, clientStatuses, getDateRange]);
 
   // Calculate workload score for a task
   const getTaskScore = useCallback((task: TrafficPlaybookTask) => {
     const baseScore = WORKLOAD_WEIGHTS[task.cadence as TrafficCadence] || 2;
     const today = new Date().toISOString().split('T')[0];
     let bonus = 0;
     if (task.status !== 'done' && task.status !== 'skipped' && task.due_date < today) bonus += 2;
     if (task.status === 'blocked') bonus += 1;
     return baseScore + bonus;
   }, []);
 
   // Work queue sorted by priority
   const workQueue = useMemo(() => {
     const today = new Date().toISOString().split('T')[0];
     const tomorrow = addDays(new Date(), 1).toISOString().split('T')[0];
 
     return [...filteredTasks].sort((a, b) => {
       // Priority: overdue > today > tomorrow > rest
       const aOverdue = a.status !== 'done' && a.status !== 'skipped' && a.due_date < today;
       const bOverdue = b.status !== 'done' && b.status !== 'skipped' && b.due_date < today;
       if (aOverdue !== bOverdue) return aOverdue ? -1 : 1;
 
       const aToday = a.due_date === today;
       const bToday = b.due_date === today;
       if (aToday !== bToday) return aToday ? -1 : 1;
 
       const aTomorrow = a.due_date === tomorrow;
       const bTomorrow = b.due_date === tomorrow;
       if (aTomorrow !== bTomorrow) return aTomorrow ? -1 : 1;
 
       return a.due_date.localeCompare(b.due_date);
     });
   }, [filteredTasks]);
 
   // Manager workload cards
   const managerWorkloads = useMemo(() => {
     const today = new Date().toISOString().split('T')[0];
     const managers: Record<string, ManagerWorkload> = {};
 
     // Initialize managers from accounts' traffic_member_id
     accounts.forEach(acc => {
       if (acc.traffic_member_id && !managers[acc.traffic_member_id]) {
         const member = teamMembers.find(m => m.id === acc.traffic_member_id);
         if (member) {
           managers[acc.traffic_member_id] = {
             id: acc.traffic_member_id,
             name: member.name,
             openTasks: 0,
             overdueTasks: 0,
             todayTasks: 0,
             blockedTasks: 0,
             workloadScore: 0,
           };
         }
       }
     });
 
     // Also add from tasks
     filteredTasks.forEach(task => {
       if (task.assigned_to && !managers[task.assigned_to]) {
         const member = teamMembers.find(m => m.id === task.assigned_to);
         if (member) {
           managers[task.assigned_to] = {
             id: task.assigned_to,
             name: member.name,
             openTasks: 0,
             overdueTasks: 0,
             todayTasks: 0,
             blockedTasks: 0,
             workloadScore: 0,
           };
         }
       }
     });
 
     // Calculate metrics
     filteredTasks.forEach(task => {
       if (!task.assigned_to || !managers[task.assigned_to]) return;
       const m = managers[task.assigned_to];
       
       if (task.status !== 'done' && task.status !== 'skipped') {
         m.openTasks++;
         m.workloadScore += getTaskScore(task);
 
         if (task.due_date < today) m.overdueTasks++;
         if (task.due_date === today) m.todayTasks++;
         if (task.status === 'blocked') m.blockedTasks++;
       }
     });
 
     return Object.values(managers).sort((a, b) => b.workloadScore - a.workloadScore);
   }, [filteredTasks, accounts, teamMembers, getTaskScore]);
 
   // Weekly schedule (Mon-Fri)
   const weeklySchedule = useMemo(() => {
     const start = startOfWeek(new Date(), { weekStartsOn: 1 });
     const days: DaySchedule[] = [];
 
     for (let i = 0; i < 5; i++) {
       const date = addDays(start, i);
       const dateStr = date.toISOString().split('T')[0];
       const dayTasks = tasks.filter(t => t.due_date === dateStr && t.status !== 'done' && t.status !== 'skipped');
 
       const byManager: Record<string, TrafficPlaybookTask[]> = {};
       dayTasks.forEach(task => {
         const managerId = task.assigned_to || 'unassigned';
         if (!byManager[managerId]) byManager[managerId] = [];
         byManager[managerId].push(task);
       });
 
       days.push({
         date: dateStr,
         weekday: i + 1, // 1=Monday
         tasks: dayTasks,
         totalScore: dayTasks.reduce((sum, t) => sum + getTaskScore(t), 0),
         byManager,
       });
     }
 
     return days;
   }, [tasks, getTaskScore]);
 
   // Blocked tasks breakdown
   const blockedBreakdown = useMemo(() => {
     const today = new Date();
     const breakdown: Record<string, BlockedBreakdown> = {};
 
     tasks.filter(t => t.status === 'blocked').forEach(task => {
       const reason = (task.blocked_reason || 'other') as TrafficBlockedReason;
       if (!breakdown[reason]) {
         breakdown[reason] = { reason, count: 0, clients: [] };
       }
       breakdown[reason].count++;
 
       // Track unique clients
       const account = accounts.find(a => a.id === task.client_id);
       if (account && !breakdown[reason].clients.some(c => c.id === account.id)) {
         const blockedDays = task.blocked_at ? differenceInDays(today, parseISO(task.blocked_at)) : 0;
         breakdown[reason].clients.push({
           id: account.id,
           name: account.name,
           days: blockedDays,
         });
       }
     });
 
     // Sort clients by days blocked
     Object.values(breakdown).forEach(b => {
       b.clients.sort((a, b) => b.days - a.days);
     });
 
     return Object.values(breakdown).sort((a, b) => b.count - a.count);
   }, [tasks, accounts]);
 
   // SLA metrics
   const slaMetrics = useMemo(() => {
     const today = new Date();
     const in48h = addDays(today, 2).toISOString().split('T')[0];
     const todayStr = today.toISOString().split('T')[0];
 
     // Tasks at risk (due in 48h, status todo/doing)
     const atRisk = tasks.filter(t => 
       (t.status === 'todo' || t.status === 'doing') &&
       t.due_date >= todayStr &&
       t.due_date <= in48h
     );
 
     // On-time completion by cadence
     const completionByCadence: Record<string, { total: number; onTime: number }> = {};
     
     tasks.filter(t => t.status === 'done' && t.completed_at).forEach(task => {
       const cadence = task.cadence || 'weekly';
       if (!completionByCadence[cadence]) {
         completionByCadence[cadence] = { total: 0, onTime: 0 };
       }
       completionByCadence[cadence].total++;
       
       const completedDate = task.completed_at!.split('T')[0];
       if (completedDate <= task.due_date) {
         completionByCadence[cadence].onTime++;
       }
     });
 
     return { atRisk, completionByCadence };
   }, [tasks]);
 
   // Update task
   const updateTask = useCallback(async (id: string, updates: Partial<TrafficPlaybookTask>) => {
     const { error } = await supabase
       .from('traffic_playbook_tasks')
       .update(updates as unknown as Record<string, unknown>)
       .eq('id', id);
 
     if (error) {
       console.error('Error updating task:', error);
       return false;
     }
 
     setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
     return true;
   }, []);
 
   // Helpers
   const getClientName = useCallback((clientId: string) => {
     return accounts.find(a => a.id === clientId)?.name || 'Cliente';
   }, [accounts]);
 
   const getManagerName = useCallback((managerId: string | null) => {
     if (!managerId) return 'Não atribuído';
     return teamMembers.find(m => m.id === managerId)?.name || 'Desconhecido';
   }, [teamMembers]);
 
   // Unique managers for filter
   const trafficManagers = useMemo(() => {
     const managerIds = new Set<string>();
     accounts.forEach(a => a.traffic_member_id && managerIds.add(a.traffic_member_id));
     tasks.forEach(t => t.assigned_to && managerIds.add(t.assigned_to));
     
     return Array.from(managerIds)
       .map(id => teamMembers.find(m => m.id === id))
       .filter(Boolean)
       .sort((a, b) => a!.name.localeCompare(b!.name)) as TeamMember[];
   }, [accounts, tasks, teamMembers]);
 
   return {
     // Data
     loading,
     filters,
     setFilters,
     workQueue,
     managerWorkloads,
     weeklySchedule,
     blockedBreakdown,
     slaMetrics,
     // Helpers
     getClientName,
     getManagerName,
     getTaskScore,
     updateTask,
     refetch: fetchData,
     // Reference data
     accounts,
     services,
     trafficManagers,
     clientStatuses,
   };
 }