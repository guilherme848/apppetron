import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentMember } from '@/hooks/usePermissions';
import { useJobRoles } from '@/hooks/useJobRoles';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { getTaskSourcesForRole, TaskSource } from '@/lib/roleVisibility';
import { isBefore, startOfToday, isToday } from 'date-fns';

export interface TaskCounts {
  total: number;
  overdue: number;
  dueToday: number;
  byModule: {
    content: number;
    traffic: number;
    cs: number;
  };
}

export interface MyTask {
  id: string;
  title: string;
  source: TaskSource;
  module: 'content' | 'traffic' | 'cs';
  status: string;
  dueDate: string | null;
  isOverdue: boolean;
  isDueToday: boolean;
  clientId?: string | null;
  clientName?: string;
}

const OPEN_STATUSES = ['todo', 'doing', 'open', 'in_progress', 'not_started', 'scheduled'];
const DONE_STATUSES = ['done', 'completed', 'cancelled', 'resolved'];

function isOpenStatus(status: string): boolean {
  const normalized = status.toLowerCase();
  return OPEN_STATUSES.includes(normalized) && !DONE_STATUSES.includes(normalized);
}

function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || DONE_STATUSES.includes(status.toLowerCase())) return false;
  return isBefore(new Date(dueDate), startOfToday());
}

function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false;
  return isToday(new Date(dueDate));
}

export function useMyTasks() {
  const { currentMemberId } = useCurrentMember();
  const { members } = useTeamMembers();
  const { roles } = useJobRoles();
  
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [counts, setCounts] = useState<TaskCounts>({
    total: 0,
    overdue: 0,
    dueToday: 0,
    byModule: { content: 0, traffic: 0, cs: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Get current member's role name
  const currentMember = members.find(m => m.id === currentMemberId);
  const currentRole = currentMember?.role_id 
    ? roles.find(r => r.id === currentMember.role_id)?.name 
    : null;
  
  const taskSources = getTaskSourcesForRole(currentRole);

  const fetchTasks = useCallback(async () => {
    if (!currentMemberId) {
      setTasks([]);
      setCounts({ total: 0, overdue: 0, dueToday: 0, byModule: { content: 0, traffic: 0, cs: 0 } });
      setLoading(false);
      return;
    }

    setLoading(true);
    const allTasks: MyTask[] = [];

    // Fetch accounts for client names
    const { data: accounts } = await supabase.from('accounts').select('id, name').or('cliente_interno.is.null,cliente_interno.eq.false');
    const accountMap = new Map(accounts?.map(a => [a.id, a.name]) || []);

    // Helper to create proper promises
    const createPromise = (fn: () => Promise<void>): Promise<void> => {
      return new Promise((resolve) => fn().then(resolve));
    };

    // Parallel fetch based on role's task sources
    const promises: Promise<void>[] = [];

    if (taskSources.includes('content_posts')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('content_posts')
            .select('id, title, status, due_date, batch_id')
            .eq('assignee_id', currentMemberId);
          data?.forEach(post => {
            if (isOpenStatus(post.status)) {
              allTasks.push({
                id: post.id,
                title: post.title,
                source: 'content_posts',
                module: 'content',
                status: post.status,
                dueDate: post.due_date,
                isOverdue: isOverdue(post.due_date, post.status),
                isDueToday: isDueToday(post.due_date),
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('content_extra_requests')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('content_extra_requests')
            .select('id, title, status, due_date, client_id')
            .eq('assignee_id', currentMemberId);
          data?.forEach(req => {
            if (isOpenStatus(req.status)) {
              allTasks.push({
                id: req.id,
                title: req.title,
                source: 'content_extra_requests',
                module: 'content',
                status: req.status,
                dueDate: req.due_date,
                isOverdue: isOverdue(req.due_date, req.status),
                isDueToday: isDueToday(req.due_date),
                clientId: req.client_id,
                clientName: accountMap.get(req.client_id) || undefined,
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('traffic_tasks')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('traffic_tasks')
            .select('id, title, status, due_date, client_id')
            .eq('assignee_id', currentMemberId);
          data?.forEach(task => {
            if (isOpenStatus(task.status)) {
              allTasks.push({
                id: task.id,
                title: task.title,
                source: 'traffic_tasks',
                module: 'traffic',
                status: task.status,
                dueDate: task.due_date,
                isOverdue: isOverdue(task.due_date, task.status),
                isDueToday: isDueToday(task.due_date),
                clientId: task.client_id,
                clientName: accountMap.get(task.client_id) || undefined,
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('traffic_creative_requests')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('traffic_creative_requests')
            .select('id, title, status, due_date, client_id')
            .eq('assignee_id', currentMemberId);
          data?.forEach(req => {
            if (isOpenStatus(req.status)) {
              allTasks.push({
                id: req.id,
                title: req.title,
                source: 'traffic_creative_requests',
                module: 'traffic',
                status: req.status,
                dueDate: req.due_date,
                isOverdue: isOverdue(req.due_date, req.status),
                isDueToday: isDueToday(req.due_date),
                clientId: req.client_id,
                clientName: accountMap.get(req.client_id) || undefined,
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('cs_client_onboarding_tasks')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('cs_client_onboarding_tasks')
            .select('id, title, status, due_at, client_onboarding_id')
            .eq('responsible_member_id', currentMemberId);
          data?.forEach(task => {
            if (isOpenStatus(task.status)) {
              allTasks.push({
                id: task.id,
                title: task.title,
                source: 'cs_client_onboarding_tasks',
                module: 'cs',
                status: task.status,
                dueDate: task.due_at,
                isOverdue: isOverdue(task.due_at, task.status),
                isDueToday: isDueToday(task.due_at),
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('cs_meeting_actions')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('cs_meeting_actions')
            .select('id, title, status, due_at, meeting_id')
            .eq('assignee_member_id', currentMemberId);
          data?.forEach(action => {
            if (isOpenStatus(action.status)) {
              allTasks.push({
                id: action.id,
                title: action.title,
                source: 'cs_meeting_actions',
                module: 'cs',
                status: action.status,
                dueDate: action.due_at,
                isOverdue: isOverdue(action.due_at, action.status),
                isDueToday: isDueToday(action.due_at),
              });
            }
          });
        })
      );
    }

    if (taskSources.includes('cs_risk_action_items')) {
      promises.push(
        createPromise(async () => {
          const { data } = await supabase
            .from('cs_risk_action_items')
            .select('id, title, status, due_at, risk_case_id')
            .eq('assignee_member_id', currentMemberId);
          data?.forEach(action => {
            if (isOpenStatus(action.status)) {
              allTasks.push({
                id: action.id,
                title: action.title,
                source: 'cs_risk_action_items',
                module: 'cs',
                status: action.status,
                dueDate: action.due_at,
                isOverdue: isOverdue(action.due_at, action.status),
                isDueToday: isDueToday(action.due_at),
              });
            }
          });
        })
      );
    }

    await Promise.all(promises);

    // Sort by due date (nulls last), then by overdue status
    allTasks.sort((a, b) => {
      // Overdue first
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      
      // Due today second
      if (a.isDueToday && !b.isDueToday) return -1;
      if (!a.isDueToday && b.isDueToday) return 1;
      
      // Then by due date
      if (a.dueDate && b.dueDate) {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      return 0;
    });

    setTasks(allTasks);

    // Calculate counts
    const newCounts: TaskCounts = {
      total: allTasks.length,
      overdue: allTasks.filter(t => t.isOverdue).length,
      dueToday: allTasks.filter(t => t.isDueToday).length,
      byModule: {
        content: allTasks.filter(t => t.module === 'content').length,
        traffic: allTasks.filter(t => t.module === 'traffic').length,
        cs: allTasks.filter(t => t.module === 'cs').length,
      },
    };
    setCounts(newCounts);
    setLoading(false);
  }, [currentMemberId, taskSources]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return {
    tasks,
    counts,
    loading,
    refetch: fetchTasks,
    currentRole,
  };
}
