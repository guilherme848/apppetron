import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrafficCycle,
  TrafficCycleTask,
  TrafficPeriod,
  TrafficTask,
  TrafficPriority,
  TrafficPeriodStatus,
  TrafficTaskStatus,
} from '@/types/traffic';

export function useTrafficData() {
  const [cycles, setCycles] = useState<TrafficCycle[]>([]);
  const [cycleTasks, setCycleTasks] = useState<TrafficCycleTask[]>([]);
  const [periods, setPeriods] = useState<TrafficPeriod[]>([]);
  const [tasks, setTasks] = useState<TrafficTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch functions
  const fetchCycles = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_cycles')
      .select('*')
      .order('cadence_days', { ascending: true });
    if (error) console.error('Error fetching traffic cycles:', error);
    else setCycles((data || []) as TrafficCycle[]);
  }, []);

  const fetchCycleTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_cycle_tasks')
      .select('*')
      .order('task_order', { ascending: true });
    if (error) console.error('Error fetching cycle tasks:', error);
    else setCycleTasks((data || []) as TrafficCycleTask[]);
  }, []);

  const fetchPeriods = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_periods')
      .select('*')
      .order('period_start', { ascending: false });
    if (error) console.error('Error fetching periods:', error);
    else setPeriods((data || []) as TrafficPeriod[]);
  }, []);

  const fetchTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_tasks')
      .select('*')
      .order('due_date', { ascending: true });
    if (error) console.error('Error fetching traffic tasks:', error);
    else setTasks((data || []) as TrafficTask[]);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCycles(), fetchCycleTasks(), fetchPeriods(), fetchTasks()]);
    setLoading(false);
  }, [fetchCycles, fetchCycleTasks, fetchPeriods, fetchTasks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // CRUD for Cycles
  const addCycle = async (cycle: { name: string; cadence_days: number; description?: string }) => {
    const { data, error } = await supabase
      .from('traffic_cycles')
      .insert([cycle])
      .select()
      .single();
    if (error) {
      console.error('Error adding cycle:', error);
      return { data: null, error: error.message };
    }
    setCycles((prev) => [...prev, data as TrafficCycle].sort((a, b) => a.cadence_days - b.cadence_days));
    return { data: data as TrafficCycle, error: null };
  };

  const updateCycle = async (id: string, updates: Partial<TrafficCycle>) => {
    const { data, error } = await supabase
      .from('traffic_cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating cycle:', error);
      return { data: null, error: error.message };
    }
    setCycles((prev) =>
      prev.map((c) => (c.id === id ? (data as TrafficCycle) : c)).sort((a, b) => a.cadence_days - b.cadence_days)
    );
    return { data: data as TrafficCycle, error: null };
  };

  const deleteCycle = async (id: string) => {
    const { error } = await supabase.from('traffic_cycles').delete().eq('id', id);
    if (error) {
      console.error('Error deleting cycle:', error);
      return { error: error.message };
    }
    setCycles((prev) => prev.filter((c) => c.id !== id));
    return { error: null };
  };

  const toggleCycleActive = async (id: string) => {
    const cycle = cycles.find((c) => c.id === id);
    if (!cycle) return;
    await updateCycle(id, { active: !cycle.active });
  };

  // CRUD for Cycle Tasks (templates)
  const addCycleTask = async (
    task: Omit<TrafficCycleTask, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const { data, error } = await supabase
      .from('traffic_cycle_tasks')
      .insert([task])
      .select()
      .single();
    if (error) {
      console.error('Error adding cycle task:', error);
      return { data: null, error: error.message };
    }
    setCycleTasks((prev) =>
      [...prev, data as TrafficCycleTask].sort((a, b) => a.task_order - b.task_order)
    );
    return { data: data as TrafficCycleTask, error: null };
  };

  const updateCycleTask = async (id: string, updates: Partial<TrafficCycleTask>) => {
    const { data, error } = await supabase
      .from('traffic_cycle_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating cycle task:', error);
      return { data: null, error: error.message };
    }
    setCycleTasks((prev) =>
      prev.map((t) => (t.id === id ? (data as TrafficCycleTask) : t)).sort((a, b) => a.task_order - b.task_order)
    );
    return { data: data as TrafficCycleTask, error: null };
  };

  const deleteCycleTask = async (id: string) => {
    const { error } = await supabase.from('traffic_cycle_tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting cycle task:', error);
      return { error: error.message };
    }
    setCycleTasks((prev) => prev.filter((t) => t.id !== id));
    return { error: null };
  };

  // CRUD for Periods
  const addPeriod = async (period: { client_id: string; cycle_id: string; period_start: string; period_end: string }) => {
    const { data, error } = await supabase
      .from('traffic_periods')
      .insert([period])
      .select()
      .single();
    if (error) {
      console.error('Error adding period:', error);
      return { data: null, error: error.message };
    }
    setPeriods((prev) => [data as TrafficPeriod, ...prev]);
    return { data: data as TrafficPeriod, error: null };
  };

  const updatePeriod = async (id: string, updates: Partial<TrafficPeriod>) => {
    const { data, error } = await supabase
      .from('traffic_periods')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating period:', error);
      return { data: null, error: error.message };
    }
    setPeriods((prev) => prev.map((p) => (p.id === id ? (data as TrafficPeriod) : p)));
    return { data: data as TrafficPeriod, error: null };
  };

  // CRUD for Tasks
  const addTrafficTask = async (
    task: Omit<TrafficTask, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const { data, error } = await supabase
      .from('traffic_tasks')
      .insert([task])
      .select()
      .single();
    if (error) {
      console.error('Error adding traffic task:', error);
      return { data: null, error: error.message };
    }
    setTasks((prev) => [...prev, data as TrafficTask]);
    return { data: data as TrafficTask, error: null };
  };

  const updateTrafficTask = async (id: string, updates: Partial<TrafficTask>) => {
    const { data, error } = await supabase
      .from('traffic_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating traffic task:', error);
      return { data: null, error: error.message };
    }
    setTasks((prev) => prev.map((t) => (t.id === id ? (data as TrafficTask) : t)));
    return { data: data as TrafficTask, error: null };
  };

  const deleteTrafficTask = async (id: string) => {
    const { error } = await supabase.from('traffic_tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting traffic task:', error);
      return { error: error.message };
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
    return { error: null };
  };

  // Generate tasks for a client's period
  const generateCycleTasks = async (clientId: string, cycleId: string, assigneeId: string | null) => {
    const cycle = cycles.find((c) => c.id === cycleId);
    if (!cycle) return { success: false, error: 'Ciclo não encontrado' };

    // Check if there's already an active period
    const existingActivePeriod = periods.find(
      (p) => p.client_id === clientId && p.status === 'active'
    );
    if (existingActivePeriod) {
      // Close the existing period
      await updatePeriod(existingActivePeriod.id, { status: 'closed' });
    }

    // Create new period
    const today = new Date();
    const periodStart = today.toISOString().split('T')[0];
    const periodEnd = new Date(today.getTime() + (cycle.cadence_days - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const periodResult = await addPeriod({
      client_id: clientId,
      cycle_id: cycleId,
      period_start: periodStart,
      period_end: periodEnd,
    });

    if (!periodResult.data) {
      return { success: false, error: periodResult.error };
    }

    // Get tasks for this cycle
    const cycleTaskTemplates = cycleTasks.filter((t) => t.cycle_id === cycleId && t.active);

    // Generate tasks
    for (const template of cycleTaskTemplates) {
      const dueDate = new Date(today.getTime() + template.due_offset_days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      await addTrafficTask({
        client_id: clientId,
        period_id: periodResult.data.id,
        title: template.title,
        details: template.details,
        status: 'todo',
        priority: template.default_priority,
        due_date: dueDate,
        assignee_id: assigneeId,
      });
    }

    await fetchTasks();
    await fetchPeriods();

    return { success: true, period: periodResult.data };
  };

  // Getters
  const getCycleById = (id: string | null) => cycles.find((c) => c.id === id);
  const getActiveCycles = () => cycles.filter((c) => c.active);
  const getCycleTasksByCycle = (cycleId: string) =>
    cycleTasks.filter((t) => t.cycle_id === cycleId).sort((a, b) => a.task_order - b.task_order);
  const getPeriodsByClient = (clientId: string) => periods.filter((p) => p.client_id === clientId);
  const getActivePeriodByClient = (clientId: string) =>
    periods.find((p) => p.client_id === clientId && p.status === 'active');
  const getTasksByPeriod = (periodId: string) => tasks.filter((t) => t.period_id === periodId);
  const getTasksByClient = (clientId: string) => tasks.filter((t) => t.client_id === clientId);
  const getTasksByAssignee = (assigneeId: string) => tasks.filter((t) => t.assignee_id === assigneeId);

  // Metrics
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today);
  const todayTasks = tasks.filter((t) => t.status !== 'done' && t.due_date === today);
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const activePeriods = periods.filter((p) => p.status === 'active');

  return {
    cycles,
    cycleTasks,
    periods,
    tasks,
    loading,
    // Cycle CRUD
    addCycle,
    updateCycle,
    deleteCycle,
    toggleCycleActive,
    // Cycle Task CRUD
    addCycleTask,
    updateCycleTask,
    deleteCycleTask,
    // Period CRUD
    addPeriod,
    updatePeriod,
    // Task CRUD
    addTrafficTask,
    updateTrafficTask,
    deleteTrafficTask,
    // Generate
    generateCycleTasks,
    // Getters
    getCycleById,
    getActiveCycles,
    getCycleTasksByCycle,
    getPeriodsByClient,
    getActivePeriodByClient,
    getTasksByPeriod,
    getTasksByClient,
    getTasksByAssignee,
    // Metrics
    overdueTasks,
    todayTasks,
    openTasks,
    activePeriods,
    // Refetch
    refetch: fetchAll,
  };
}
