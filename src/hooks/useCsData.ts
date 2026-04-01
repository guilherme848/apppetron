import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CsOnboardingFlow,
  CsOnboardingFlowTask,
  CsOnboardingFlowRule,
  CsClientOnboarding,
  CsClientOnboardingTask,
  CsMeeting,
  CsMeetingAction,
  CsNpsSurvey,
  CsNpsTag,
  CsNpsResponse,
  CsRiskCase,
  CsRiskActionItem,
  CsCancellation,
  CsCancellationReason,
  CsSetting,
  CsDashboardMetrics,
  CsAlert,
  CsAuditLog,
} from '@/types/cs';
import { useCurrentMember } from '@/hooks/usePermissions';

// Helper to get NPS classification
export function getNpsClassification(score: number): 'promoter' | 'passive' | 'detractor' {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

// ============ Audit Log ============
export function useCsAuditLog(clientId?: string) {
  const [logs, setLogs] = useState<CsAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('cs_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching audit logs:', error);
    } else {
      setLogs(data || []);
    }
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return { logs, loading, refetch: fetchLogs };
}

export function useLogCsAction() {
  const { currentMemberId } = useCurrentMember();

  const logAction = useCallback(async (
    entityType: string,
    entityId: string,
    action: string,
    clientId?: string | null,
    changesJson?: Record<string, unknown>
  ) => {
    const { error } = await supabase.from('cs_audit_log').insert([{
      entity_type: entityType,
      entity_id: entityId,
      action,
      client_id: clientId || null,
      changed_by_member_id: currentMemberId || null,
      changes_json: changesJson ? JSON.parse(JSON.stringify(changesJson)) : null,
    }]);
    if (error) console.error('Error logging action:', error);
  }, [currentMemberId]);

  return { logAction };
}

// ============ Settings ============
export function useCsSettings() {
  const [settings, setSettings] = useState<CsSetting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('cs_settings').select('*');
    if (error) {
      console.error('Error fetching CS settings:', error);
    } else {
      setSettings(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const getSetting = useCallback((key: string): string | null => {
    const setting = settings.find(s => s.key === key);
    return setting?.value ?? null;
  }, [settings]);

  const updateSetting = useCallback(async (key: string, value: string) => {
    const { error } = await supabase
      .from('cs_settings')
      .update({ value })
      .eq('key', key);
    if (error) {
      console.error('Error updating setting:', error);
      return { success: false, error: error.message };
    }
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    return { success: true };
  }, []);

  return { settings, loading, getSetting, updateSetting, refetch: fetchSettings };
}

// ============ Onboarding Flows ============
export function useCsOnboardingFlows() {
  const [flows, setFlows] = useState<CsOnboardingFlow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_onboarding_flows')
      .select('*')
      .order('name');
    if (error) {
      console.error('Error fetching onboarding flows:', error);
    } else {
      setFlows(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFlows();
  }, [fetchFlows]);

  const addFlow = useCallback(async (name: string, description?: string) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flows')
      .insert({ name, description })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setFlows(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true, data };
  }, []);

  const updateFlow = useCallback(async (id: string, updates: Partial<CsOnboardingFlow>) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flows')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setFlows(prev => prev.map(f => f.id === id ? data : f));
    return { success: true, data };
  }, []);

  const deleteFlow = useCallback(async (id: string) => {
    const { error } = await supabase.from('cs_onboarding_flows').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setFlows(prev => prev.filter(f => f.id !== id));
    return { success: true };
  }, []);

  return { flows, loading, addFlow, updateFlow, deleteFlow, refetch: fetchFlows };
}

// ============ Onboarding Flow Tasks ============
export function useCsFlowTasks(flowId: string | null) {
  const [tasks, setTasks] = useState<CsOnboardingFlowTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!flowId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_onboarding_flow_tasks')
      .select('*')
      .eq('flow_id', flowId)
      .order('sort_order');
    if (error) {
      console.error('Error fetching flow tasks:', error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  }, [flowId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async (task: Omit<CsOnboardingFlowTask, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flow_tasks')
      .insert(task)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setTasks(prev => [...prev, data].sort((a, b) => a.sort_order - b.sort_order));
    return { success: true, data };
  }, []);

  const updateTask = useCallback(async (id: string, updates: Partial<CsOnboardingFlowTask>) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flow_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setTasks(prev => prev.map(t => t.id === id ? data : t).sort((a, b) => a.sort_order - b.sort_order));
    return { success: true, data };
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from('cs_onboarding_flow_tasks').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setTasks(prev => prev.filter(t => t.id !== id));
    return { success: true };
  }, []);

  const updateTasksOrder = useCallback(async (orderedTasks: CsOnboardingFlowTask[]) => {
    const updates = orderedTasks.map((task, index) => ({
      id: task.id,
      sort_order: index,
    }));
    await Promise.all(updates.map(({ id, sort_order }) =>
      supabase.from('cs_onboarding_flow_tasks').update({ sort_order }).eq('id', id)
    ));
    setTasks(orderedTasks.map((t, i) => ({ ...t, sort_order: i })));
  }, []);

  return { tasks, loading, addTask, updateTask, deleteTask, updateTasksOrder, refetch: fetchTasks };
}

// ============ Onboarding Flow Rules ============
export function useCsFlowRules(flowId: string | null) {
  const [rules, setRules] = useState<CsOnboardingFlowRule[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRules = useCallback(async () => {
    if (!flowId) {
      setRules([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_onboarding_flow_rules')
      .select('*')
      .eq('flow_id', flowId)
      .order('priority', { ascending: false });
    if (error) {
      console.error('Error fetching flow rules:', error);
    } else {
      setRules(data || []);
    }
    setLoading(false);
  }, [flowId]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const addRule = useCallback(async (rule: Omit<CsOnboardingFlowRule, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flow_rules')
      .insert(rule)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setRules(prev => [...prev, data].sort((a, b) => b.priority - a.priority));
    return { success: true, data };
  }, []);

  const updateRule = useCallback(async (id: string, updates: Partial<CsOnboardingFlowRule>) => {
    const { data, error } = await supabase
      .from('cs_onboarding_flow_rules')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setRules(prev => prev.map(r => r.id === id ? data : r).sort((a, b) => b.priority - a.priority));
    return { success: true, data };
  }, []);

  const deleteRule = useCallback(async (id: string) => {
    const { error } = await supabase.from('cs_onboarding_flow_rules').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setRules(prev => prev.filter(r => r.id !== id));
    return { success: true };
  }, []);

  return { rules, loading, addRule, updateRule, deleteRule, refetch: fetchRules };
}

// ============ Client Onboarding ============
export function useCsClientOnboarding() {
  const [onboardings, setOnboardings] = useState<CsClientOnboarding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOnboardings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_client_onboarding')
      .select(`
        *,
        accounts:client_id (name),
        cs_onboarding_flows:flow_id (name)
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching client onboardings:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        flow_name: d.cs_onboarding_flows?.name,
      }));
      setOnboardings(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOnboardings();
  }, [fetchOnboardings]);

  const getByClientId = useCallback((clientId: string) => {
    return onboardings.find(o => o.client_id === clientId);
  }, [onboardings]);

  const startOnboarding = useCallback(async (clientId: string, flowId: string) => {
    // Get flow tasks
    const { data: tasks } = await supabase
      .from('cs_onboarding_flow_tasks')
      .select('*')
      .eq('flow_id', flowId)
      .eq('active', true)
      .order('sort_order');

    const maxDueDays = Math.max(...(tasks || []).map(t => t.default_due_days), 0);
    const startedAt = new Date();
    const expectedEndAt = new Date(startedAt);
    expectedEndAt.setDate(expectedEndAt.getDate() + maxDueDays);

    // Create onboarding
    const { data: onboarding, error } = await supabase
      .from('cs_client_onboarding')
      .insert({
        client_id: clientId,
        flow_id: flowId,
        status: 'in_progress',
        started_at: startedAt.toISOString(),
        expected_end_at: expectedEndAt.toISOString(),
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Get client to assign responsibles
    const { data: client } = await supabase
      .from('accounts')
      .select('cs_member_id, social_member_id, traffic_member_id, support_member_id, designer_member_id, videomaker_member_id')
      .eq('id', clientId)
      .single();

    const roleFieldMap: Record<string, string> = {
      cs: 'cs_member_id',
      social: 'social_member_id',
      traffic: 'traffic_member_id',
      support: 'support_member_id',
      designer: 'designer_member_id',
      videomaker: 'videomaker_member_id',
    };

    // Create tasks
    const clientTasks = (tasks || []).map((t, index) => {
      const dueAt = new Date(startedAt);
      dueAt.setDate(dueAt.getDate() + t.default_due_days);

      let responsibleMemberId: string | null = null;
      if (t.default_responsible_role_key && client) {
        const field = roleFieldMap[t.default_responsible_role_key];
        if (field) {
          responsibleMemberId = (client as any)[field] || null;
        }
      }

      return {
        client_onboarding_id: onboarding.id,
        template_task_id: t.id,
        title: t.title,
        description_rich: t.description_rich,
        required: t.required,
        due_at: dueAt.toISOString(),
        responsible_member_id: responsibleMemberId,
        sort_order: index,
        status: 'not_started',
      };
    });

    if (clientTasks.length > 0) {
      await supabase.from('cs_client_onboarding_tasks').insert(clientTasks);
    }

    await fetchOnboardings();
    return { success: true, data: onboarding };
  }, [fetchOnboardings]);

  const updateOnboarding = useCallback(async (id: string, updates: Partial<CsClientOnboarding>) => {
    const { data, error } = await supabase
      .from('cs_client_onboarding')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchOnboardings();
    return { success: true, data };
  }, [fetchOnboardings]);

  return { onboardings, loading, getByClientId, startOnboarding, updateOnboarding, refetch: fetchOnboardings };
}

// ============ Client Onboarding Tasks ============
export function useCsClientTasks(onboardingId: string | null) {
  const [tasks, setTasks] = useState<CsClientOnboardingTask[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!onboardingId) {
      setTasks([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_client_onboarding_tasks')
      .select(`
        *,
        team_members:responsible_member_id (name)
      `)
      .eq('client_onboarding_id', onboardingId)
      .order('sort_order');
    if (error) {
      console.error('Error fetching client tasks:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        responsible_member_name: d.team_members?.name,
      }));
      setTasks(mapped);
    }
    setLoading(false);
  }, [onboardingId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<CsClientOnboardingTask>) => {
    // If marking as done, set completed_at
    if (updates.status === 'done' && !updates.completed_at) {
      updates.completed_at = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from('cs_client_onboarding_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchTasks();
    return { success: true, data };
  }, [fetchTasks]);

  return { tasks, loading, updateTask, refetch: fetchTasks };
}

// ============ Meetings ============
export function useCsMeetings() {
  const [meetings, setMeetings] = useState<CsMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_meetings')
      .select(`
        *,
        accounts:client_id (name),
        team_members:responsible_member_id (name)
      `)
      .order('meeting_date', { ascending: false });
    if (error) {
      console.error('Error fetching meetings:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        responsible_member_name: d.team_members?.name,
      }));
      setMeetings(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [fetchMeetings]);

  const addMeeting = useCallback(async (meeting: Omit<CsMeeting, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_meetings')
      .insert(meeting)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchMeetings();
    return { success: true, data };
  }, [fetchMeetings]);

  const updateMeeting = useCallback(async (id: string, updates: Partial<CsMeeting>) => {
    const { data, error } = await supabase
      .from('cs_meetings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchMeetings();
    return { success: true, data };
  }, [fetchMeetings]);

  const deleteMeeting = useCallback(async (id: string) => {
    const { error } = await supabase.from('cs_meetings').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setMeetings(prev => prev.filter(m => m.id !== id));
    return { success: true };
  }, []);

  const getMeetingsByClient = useCallback((clientId: string) => {
    return meetings.filter(m => m.client_id === clientId);
  }, [meetings]);

  return { meetings, loading, addMeeting, updateMeeting, deleteMeeting, getMeetingsByClient, refetch: fetchMeetings };
}

// ============ Meeting Actions ============
export function useCsMeetingActions(meetingId: string | null) {
  const [actions, setActions] = useState<CsMeetingAction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActions = useCallback(async () => {
    if (!meetingId) {
      setActions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_meeting_actions')
      .select(`
        *,
        team_members:assignee_member_id (name)
      `)
      .eq('meeting_id', meetingId)
      .order('created_at');
    if (error) {
      console.error('Error fetching meeting actions:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        assignee_member_name: d.team_members?.name,
      }));
      setActions(mapped);
    }
    setLoading(false);
  }, [meetingId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const addAction = useCallback(async (action: Omit<CsMeetingAction, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_meeting_actions')
      .insert(action)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchActions();
    return { success: true, data };
  }, [fetchActions]);

  const updateAction = useCallback(async (id: string, updates: Partial<CsMeetingAction>) => {
    const { data, error } = await supabase
      .from('cs_meeting_actions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchActions();
    return { success: true, data };
  }, [fetchActions]);

  const deleteAction = useCallback(async (id: string) => {
    const { error } = await supabase.from('cs_meeting_actions').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    setActions(prev => prev.filter(a => a.id !== id));
    return { success: true };
  }, []);

  return { actions, loading, addAction, updateAction, deleteAction, refetch: fetchActions };
}

// ============ NPS ============
export function useCsNps() {
  const [responses, setResponses] = useState<CsNpsResponse[]>([]);
  const [surveys, setSurveys] = useState<CsNpsSurvey[]>([]);
  const [tags, setTags] = useState<CsNpsTag[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [responsesRes, surveysRes, tagsRes] = await Promise.all([
      supabase.from('cs_nps_responses').select(`*, accounts:client_id (name), cs_nps_surveys:survey_id (name)`).order('created_at', { ascending: false }),
      supabase.from('cs_nps_surveys').select('*').order('name'),
      supabase.from('cs_nps_tags').select('*').order('name'),
    ]);

    if (!responsesRes.error) {
      const mapped = (responsesRes.data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        survey_name: d.cs_nps_surveys?.name,
      }));
      setResponses(mapped);
    }
    if (!surveysRes.error) setSurveys(surveysRes.data || []);
    if (!tagsRes.error) setTags(tagsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addResponse = useCallback(async (
    clientId: string,
    score: number,
    surveyId?: string | null,
    commentRich?: string | null,
    tagIds?: string[]
  ) => {
    const classification = getNpsClassification(score);
    const { data, error } = await supabase
      .from('cs_nps_responses')
      .insert({
        client_id: clientId,
        survey_id: surveyId || null,
        score,
        comment_rich: commentRich || null,
        classification,
      })
      .select()
      .single();
    if (error) return { success: false, error: error.message };

    // Add tags
    if (tagIds && tagIds.length > 0) {
      await supabase.from('cs_nps_response_tags').insert(
        tagIds.map(tagId => ({ response_id: data.id, tag_id: tagId }))
      );
    }

    await fetchAll();
    return { success: true, data };
  }, [fetchAll]);

  const addTag = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('cs_nps_tags')
      .insert({ name })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setTags(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true, data };
  }, []);

  const updateTag = useCallback(async (id: string, updates: Partial<CsNpsTag>) => {
    const { error } = await supabase.from('cs_nps_tags').update(updates).eq('id', id);
    if (error) return { success: false, error: error.message };
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    return { success: true };
  }, []);

  const getAverageNps = useCallback(() => {
    if (responses.length === 0) return 0;
    const total = responses.reduce((sum, r) => sum + r.score, 0);
    return total / responses.length;
  }, [responses]);

  const getNpsScore = useCallback(() => {
    if (responses.length === 0) return 0;
    const promoters = responses.filter(r => r.classification === 'promoter').length;
    const detractors = responses.filter(r => r.classification === 'detractor').length;
    return Math.round(((promoters - detractors) / responses.length) * 100);
  }, [responses]);

  return {
    responses,
    surveys,
    tags,
    loading,
    addResponse,
    addTag,
    updateTag,
    getAverageNps,
    getNpsScore,
    refetch: fetchAll,
  };
}

// ============ Risk Cases ============
export function useCsRiskCases() {
  const [cases, setCases] = useState<CsRiskCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_risk_cases')
      .select(`
        *,
        accounts:client_id (name),
        team_members:owner_member_id (name)
      `)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching risk cases:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
        owner_member_name: d.team_members?.name,
      }));
      setCases(mapped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const addCase = useCallback(async (riskCase: Omit<CsRiskCase, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_risk_cases')
      .insert(riskCase)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchCases();
    return { success: true, data };
  }, [fetchCases]);

  const updateCase = useCallback(async (id: string, updates: Partial<CsRiskCase>) => {
    const { data, error } = await supabase
      .from('cs_risk_cases')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchCases();
    return { success: true, data };
  }, [fetchCases]);

  const getCasesByClient = useCallback((clientId: string) => {
    return cases.filter(c => c.client_id === clientId);
  }, [cases]);

  return { cases, loading, addCase, updateCase, getCasesByClient, refetch: fetchCases };
}

// ============ Risk Action Items ============
export function useCsRiskActions(caseId: string | null) {
  const [actions, setActions] = useState<CsRiskActionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActions = useCallback(async () => {
    if (!caseId) {
      setActions([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('cs_risk_action_items')
      .select(`
        *,
        team_members:assignee_member_id (name)
      `)
      .eq('risk_case_id', caseId)
      .order('created_at');
    if (error) {
      console.error('Error fetching risk actions:', error);
    } else {
      const mapped = (data || []).map((d: any) => ({
        ...d,
        assignee_member_name: d.team_members?.name,
      }));
      setActions(mapped);
    }
    setLoading(false);
  }, [caseId]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  const addAction = useCallback(async (action: Omit<CsRiskActionItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('cs_risk_action_items')
      .insert(action)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchActions();
    return { success: true, data };
  }, [fetchActions]);

  const updateAction = useCallback(async (id: string, updates: Partial<CsRiskActionItem>) => {
    const { data, error } = await supabase
      .from('cs_risk_action_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    await fetchActions();
    return { success: true, data };
  }, [fetchActions]);

  return { actions, loading, addAction, updateAction, refetch: fetchActions };
}

// ============ Cancellations ============
export function useCsCancellations() {
  const [cancellations, setCancellations] = useState<CsCancellation[]>([]);
  const [reasons, setReasons] = useState<CsCancellationReason[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [cancellationsRes, reasonsRes] = await Promise.all([
      supabase.from('cs_cancellations').select(`*, accounts:client_id (name)`).order('created_at', { ascending: false }),
      supabase.from('cs_cancellation_reasons').select('*').order('name'),
    ]);

    if (!cancellationsRes.error) {
      const mapped = (cancellationsRes.data || []).map((d: any) => ({
        ...d,
        client_name: d.accounts?.name,
      }));
      setCancellations(mapped);
    }
    if (!reasonsRes.error) setReasons(reasonsRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const addCancellation = useCallback(async (
    clientId: string,
    effectiveCancelDate: string,
    retentionAttempted: boolean,
    reasonIds: string[],
    offerApplied?: string | null,
    notesRich?: string | null
  ) => {
    const { data, error } = await supabase
      .from('cs_cancellations')
      .insert({
        client_id: clientId,
        effective_cancel_date: effectiveCancelDate,
        retention_attempted: retentionAttempted,
        offer_applied: offerApplied || null,
        notes_rich: notesRich || null,
      })
      .select()
      .single();
    if (error) return { success: false, error: error.message };

    // Add reason links
    if (reasonIds.length > 0) {
      await supabase.from('cs_cancellation_reason_links').insert(
        reasonIds.map(reasonId => ({ cancellation_id: data.id, reason_id: reasonId }))
      );
    }

    await fetchAll();
    return { success: true, data };
  }, [fetchAll]);

  const addReason = useCallback(async (name: string) => {
    const { data, error } = await supabase
      .from('cs_cancellation_reasons')
      .insert({ name })
      .select()
      .single();
    if (error) return { success: false, error: error.message };
    setReasons(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return { success: true, data };
  }, []);

  const updateReason = useCallback(async (id: string, updates: Partial<CsCancellationReason>) => {
    const { error } = await supabase.from('cs_cancellation_reasons').update(updates).eq('id', id);
    if (error) return { success: false, error: error.message };
    setReasons(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
    return { success: true };
  }, []);

  return { cancellations, reasons, loading, addCancellation, addReason, updateReason, refetch: fetchAll };
}

// ============ Dashboard Metrics ============
export function useCsDashboardMetrics() {
  const [metrics, setMetrics] = useState<CsDashboardMetrics | null>(null);
  const [alerts, setAlerts] = useState<CsAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      activeClientsRes,
      onboardingRes,
      riskRes,
      cancellationsRes,
      npsRes,
      settingsRes,
      meetingsRes,
    ] = await Promise.all([
      supabase.from('accounts').select('id', { count: 'exact' }).eq('status', 'active').or('cliente_interno.is.null,cliente_interno.eq.false'),
      supabase.from('onboardings').select('*').eq('status', 'em_andamento'),
      supabase.from('cs_risk_cases').select('id', { count: 'exact' }).in('status', ['open', 'in_progress']),
      supabase.from('cs_cancellations').select('id', { count: 'exact' }).gte('effective_cancel_date', startOfMonth.toISOString().split('T')[0]),
      supabase.from('cs_nps_responses').select('score'),
      supabase.from('cs_settings').select('*'),
      supabase.from('cs_meetings').select('client_id, meeting_date').eq('status', 'done'),
    ]);

    const activeClients = activeClientsRes.count || 0;
    const clientsInOnboarding = (onboardingRes.data || []).length;
    const clientsAtRisk = riskRes.count || 0;
    const cancellationsThisMonth = cancellationsRes.count || 0;

    // Calculate churn rate
    const churnRate = activeClients > 0 ? (cancellationsThisMonth / activeClients) * 100 : 0;

    // Calculate average NPS
    const npsScores = (npsRes.data || []).map((r: any) => r.score);
    const averageNps = npsScores.length > 0 ? npsScores.reduce((a: number, b: number) => a + b, 0) / npsScores.length : 0;

    // Calculate avg onboarding time
    const { data: completedOnboardings } = await supabase
      .from('cs_client_onboarding')
      .select('started_at, completed_at')
      .eq('status', 'completed')
      .not('completed_at', 'is', null);

    let avgOnboardingDays = 0;
    if (completedOnboardings && completedOnboardings.length > 0) {
      const totalDays = completedOnboardings.reduce((sum, o) => {
        if (o.started_at && o.completed_at) {
          const start = new Date(o.started_at);
          const end = new Date(o.completed_at);
          return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        }
        return sum;
      }, 0);
      avgOnboardingDays = totalDays / completedOnboardings.length;
    }

    setMetrics({
      activeClients,
      clientsInOnboarding,
      clientsAtRisk,
      cancellationsThisMonth,
      churnRate,
      averageNps,
      avgOnboardingDays,
    });

    // Generate alerts
    const newAlerts: CsAlert[] = [];
    const daysWithoutMeetingAlert = parseInt((settingsRes.data || []).find((s: any) => s.key === 'days_without_meeting_alert')?.value || '30');

    // Onboarding delays
    const overdueOnboardings = (onboardingRes.data || []).filter((o: any) => {
      if (!o.expected_end_at) return false;
      return new Date(o.expected_end_at) < now;
    });
    
    for (const o of overdueOnboardings) {
      const { data: client } = await supabase.from('accounts').select('name').eq('id', o.client_id).single();
      if (client) {
        const daysOverdue = Math.ceil((now.getTime() - new Date(o.expected_end_at).getTime()) / (1000 * 60 * 60 * 24));
        newAlerts.push({
          type: 'onboarding_delayed',
          clientId: o.client_id,
          clientName: client.name,
          details: `Onboarding atrasado há ${daysOverdue} dias`,
          daysOverdue,
        });
      }
    }

    // No meeting alerts
    const { data: activeAccountsData } = await supabase.from('accounts').select('id, name').eq('status', 'active');
    const allMeetings = meetingsRes.data || [];
    
    for (const account of (activeAccountsData || [])) {
      const clientMeetings = allMeetings.filter((m: any) => m.client_id === account.id);
      const lastMeeting = clientMeetings.sort((a: any, b: any) => 
        new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime()
      )[0];

      if (!lastMeeting) {
        newAlerts.push({
          type: 'no_meeting',
          clientId: account.id,
          clientName: account.name,
          details: 'Nenhuma reunião registrada',
        });
      } else {
        const daysSince = Math.ceil((now.getTime() - new Date(lastMeeting.meeting_date).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince > daysWithoutMeetingAlert) {
          newAlerts.push({
            type: 'no_meeting',
            clientId: account.id,
            clientName: account.name,
            details: `Última reunião há ${daysSince} dias`,
            daysOverdue: daysSince - daysWithoutMeetingAlert,
          });
        }
      }
    }

    // Detractors without follow-up
    const { data: recentDetractors } = await supabase
      .from('cs_nps_responses')
      .select('client_id')
      .eq('classification', 'detractor')
      .gte('created_at', new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const { data: openRiskCases } = await supabase
      .from('cs_risk_cases')
      .select('client_id')
      .in('status', ['open', 'in_progress']);

    const riskClientIds = new Set((openRiskCases || []).map((r: any) => r.client_id));
    
    for (const detractor of (recentDetractors || [])) {
      if (!riskClientIds.has(detractor.client_id)) {
        const { data: client } = await supabase.from('accounts').select('name').eq('id', detractor.client_id).single();
        if (client) {
          newAlerts.push({
            type: 'detractor_no_followup',
            clientId: detractor.client_id,
            clientName: client.name,
            details: 'NPS detrator sem caso de risco aberto',
          });
        }
      }
    }

    setAlerts(newAlerts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return { metrics, alerts, loading, refetch: fetchMetrics };
}
