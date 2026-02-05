 import { useState, useEffect, useCallback } from 'react';
 import { supabase } from '@/integrations/supabase/client';
 import {
   TrafficPlaybookTemplate,
   TrafficPlaybookOverride,
   TrafficPlaybookTask,
   TrafficClientStatus,
   TrafficCadence,
   TrafficTaskStatus,
   TrafficCampaignStatus,
  ChecklistJson,
 } from '@/types/trafficPlaybook';
 import { toast } from 'sonner';
 
 export function useTrafficPlaybook() {
   const [templates, setTemplates] = useState<TrafficPlaybookTemplate[]>([]);
   const [overrides, setOverrides] = useState<TrafficPlaybookOverride[]>([]);
   const [tasks, setTasks] = useState<TrafficPlaybookTask[]>([]);
   const [clientStatuses, setClientStatuses] = useState<TrafficClientStatus[]>([]);
   const [loading, setLoading] = useState(true);
 
   // Fetch all data
   const fetchTemplates = useCallback(async () => {
     const { data, error } = await supabase
       .from('traffic_playbook_templates')
       .select('*')
       .order('sort_order', { ascending: true });
     if (error) console.error('Error fetching templates:', error);
    else setTemplates((data || []) as unknown as TrafficPlaybookTemplate[]);
   }, []);
 
   const fetchOverrides = useCallback(async () => {
     const { data, error } = await supabase
       .from('traffic_playbook_overrides')
       .select('*');
     if (error) console.error('Error fetching overrides:', error);
     else setOverrides((data || []) as TrafficPlaybookOverride[]);
   }, []);
 
   const fetchTasks = useCallback(async () => {
     const { data, error } = await supabase
       .from('traffic_playbook_tasks')
       .select('*')
       .order('due_date', { ascending: true });
     if (error) console.error('Error fetching tasks:', error);
    else setTasks((data || []) as unknown as TrafficPlaybookTask[]);
   }, []);
 
   const fetchClientStatuses = useCallback(async () => {
     const { data, error } = await supabase
       .from('traffic_client_status')
       .select('*');
     if (error) console.error('Error fetching client statuses:', error);
     else setClientStatuses((data || []) as TrafficClientStatus[]);
   }, []);
 
   const fetchAll = useCallback(async () => {
     setLoading(true);
     await Promise.all([
       fetchTemplates(),
       fetchOverrides(),
       fetchTasks(),
       fetchClientStatuses(),
     ]);
     setLoading(false);
   }, [fetchTemplates, fetchOverrides, fetchTasks, fetchClientStatuses]);
 
   useEffect(() => {
     fetchAll();
   }, [fetchAll]);
 
   // Template CRUD
   const addTemplate = async (template: Omit<TrafficPlaybookTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
     const { data, error } = await supabase
       .from('traffic_playbook_templates')
      .insert([template as any])
       .select()
       .single();
     if (error) {
       console.error('Error adding template:', error);
       toast.error('Erro ao criar template');
       return { data: null, error };
     }
    setTemplates(prev => [...prev, data as unknown as TrafficPlaybookTemplate].sort((a, b) => a.sort_order - b.sort_order));
     toast.success('Template criado com sucesso');
    return { data: data as unknown as TrafficPlaybookTemplate, error: null };
   };
 
   const updateTemplate = async (id: string, updates: Partial<TrafficPlaybookTemplate>) => {
     const { data, error } = await supabase
       .from('traffic_playbook_templates')
      .update(updates as unknown as Record<string, unknown>)
       .eq('id', id)
       .select()
       .single();
     if (error) {
       console.error('Error updating template:', error);
       toast.error('Erro ao atualizar template');
       return { data: null, error };
     }
    setTemplates(prev => prev.map(t => t.id === id ? data as unknown as TrafficPlaybookTemplate : t));
     toast.success('Template atualizado');
    return { data: data as unknown as TrafficPlaybookTemplate, error: null };
   };
 
   const deleteTemplate = async (id: string) => {
     const { error } = await supabase
       .from('traffic_playbook_templates')
       .delete()
       .eq('id', id);
     if (error) {
       console.error('Error deleting template:', error);
       toast.error('Erro ao excluir template');
       return { error };
     }
     setTemplates(prev => prev.filter(t => t.id !== id));
     toast.success('Template excluído');
     return { error: null };
   };
 
   const toggleTemplateActive = async (id: string) => {
     const template = templates.find(t => t.id === id);
     if (!template) return;
     await updateTemplate(id, { active: !template.active });
   };
 
   // Task CRUD
   const updateTask = async (id: string, updates: Partial<TrafficPlaybookTask>) => {
     const { data, error } = await supabase
       .from('traffic_playbook_tasks')
      .update(updates as unknown as Record<string, unknown>)
       .eq('id', id)
       .select()
       .single();
     if (error) {
       console.error('Error updating task:', error);
       toast.error('Erro ao atualizar tarefa');
       return { data: null, error };
     }
    setTasks(prev => prev.map(t => t.id === id ? data as unknown as TrafficPlaybookTask : t));
    return { data: data as unknown as TrafficPlaybookTask, error: null };
   };
 
   const updateTaskStatus = async (id: string, status: TrafficTaskStatus) => {
     return updateTask(id, { status });
   };
 
  const updateTaskChecklist = async (id: string, checklist: ChecklistJson) => {
     return updateTask(id, { checklist });
   };
 
   // Client Status CRUD
   const upsertClientStatus = async (clientId: string, status: TrafficCampaignStatus, notes?: string) => {
     const { data, error } = await supabase
       .from('traffic_client_status')
       .upsert({
         client_id: clientId,
         campaign_status: status,
         notes: notes || null,
       })
       .select()
       .single();
     if (error) {
       console.error('Error upserting client status:', error);
       toast.error('Erro ao atualizar status do cliente');
       return { data: null, error };
     }
     setClientStatuses(prev => {
       const existing = prev.find(s => s.client_id === clientId);
       if (existing) {
         return prev.map(s => s.client_id === clientId ? data as TrafficClientStatus : s);
       }
       return [...prev, data as TrafficClientStatus];
     });
     toast.success('Status atualizado');
     return { data: data as TrafficClientStatus, error: null };
   };
 
   // Generate tasks via edge function
   const generateTasks = async (windowDays = 30, clientId?: string) => {
     try {
       const { data, error } = await supabase.functions.invoke('generate-traffic-tasks', {
         body: { window_days: windowDays, client_id: clientId },
       });
       if (error) throw error;
       toast.success(`${data.created} tarefas criadas`);
       await fetchTasks();
       return data;
     } catch (error: unknown) {
       console.error('Error generating tasks:', error);
       toast.error('Erro ao gerar tarefas');
       throw error;
     }
   };
 
   // Override CRUD
   const upsertOverride = async (override: Omit<TrafficPlaybookOverride, 'id' | 'created_at' | 'updated_at'>) => {
     const { data, error } = await supabase
       .from('traffic_playbook_overrides')
       .upsert(override, { onConflict: 'client_id,template_id' })
       .select()
       .single();
     if (error) {
       console.error('Error upserting override:', error);
       toast.error('Erro ao salvar customização');
       return { data: null, error };
     }
     setOverrides(prev => {
       const existing = prev.find(o => o.client_id === override.client_id && o.template_id === override.template_id);
       if (existing) {
         return prev.map(o => (o.client_id === override.client_id && o.template_id === override.template_id) ? data as TrafficPlaybookOverride : o);
       }
       return [...prev, data as TrafficPlaybookOverride];
     });
     toast.success('Customização salva');
     return { data: data as TrafficPlaybookOverride, error: null };
   };
 
   // Getters
   const getTemplatesByService = (serviceId: string) => 
     templates.filter(t => t.service_id === serviceId);
 
   const getTemplatesByCadence = (cadence: TrafficCadence) =>
     templates.filter(t => t.cadence === cadence);
 
   const getTemplatesByServiceAndCadence = (serviceId: string, cadence: TrafficCadence) =>
     templates.filter(t => t.service_id === serviceId && t.cadence === cadence);
 
   const getTasksByClient = (clientId: string) =>
     tasks.filter(t => t.client_id === clientId);
 
   const getTasksByAssignee = (assigneeId: string) =>
     tasks.filter(t => t.assigned_to === assigneeId);
 
   const getClientStatus = (clientId: string) =>
     clientStatuses.find(s => s.client_id === clientId);
 
   const getOverridesByClient = (clientId: string) =>
     overrides.filter(o => o.client_id === clientId);
 
   const getOverride = (clientId: string, templateId: string) =>
     overrides.find(o => o.client_id === clientId && o.template_id === templateId);
 
   // Metrics
   const today = new Date().toISOString().split('T')[0];
   const overdueTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && t.due_date < today);
   const todayTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped' && t.due_date === today);
   const pendingTasks = tasks.filter(t => t.status === 'todo' || t.status === 'doing');
 
   return {
     // Data
     templates,
     overrides,
     tasks,
     clientStatuses,
     loading,
     // Template CRUD
     addTemplate,
     updateTemplate,
     deleteTemplate,
     toggleTemplateActive,
     // Task CRUD
     updateTask,
     updateTaskStatus,
     updateTaskChecklist,
     // Client Status
     upsertClientStatus,
     // Override
     upsertOverride,
     // Generate
     generateTasks,
     // Getters
     getTemplatesByService,
     getTemplatesByCadence,
     getTemplatesByServiceAndCadence,
     getTasksByClient,
     getTasksByAssignee,
     getClientStatus,
     getOverridesByClient,
     getOverride,
     // Metrics
     overdueTasks,
     todayTasks,
     pendingTasks,
     // Refetch
     refetch: fetchAll,
   };
 }