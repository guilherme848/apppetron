import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  TrafficRoutine,
  TrafficCycle,
  TrafficRoutineCycle,
  TrafficCycleRoutine,
  TrafficRoutineTask,
  TrafficCycleTask,
  TrafficPeriod,
  TrafficTask,
  TrafficPriority,
  RoutineFrequency,
} from '@/types/traffic';

export function useTrafficData() {
  // New model state
  const [trafficRoutines, setTrafficRoutines] = useState<TrafficRoutine[]>([]);
  const [routineCycles, setRoutineCycles] = useState<TrafficRoutineCycle[]>([]);
  
  // Existing state
  const [cycles, setCycles] = useState<TrafficCycle[]>([]);
  const [routines, setRoutines] = useState<TrafficCycleRoutine[]>([]); // Legacy cycle routines
  const [routineTasks, setRoutineTasks] = useState<TrafficRoutineTask[]>([]);
  const [cycleTasks, setCycleTasks] = useState<TrafficCycleTask[]>([]);
  const [periods, setPeriods] = useState<TrafficPeriod[]>([]);
  const [tasks, setTasks] = useState<TrafficTask[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch functions - New model
  const fetchTrafficRoutines = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_routines')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('Error fetching traffic routines:', error);
    else setTrafficRoutines((data || []) as TrafficRoutine[]);
  }, []);

  const fetchRoutineCycles = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_routine_cycles')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) console.error('Error fetching routine cycles:', error);
    else setRoutineCycles((data || []) as TrafficRoutineCycle[]);
  }, []);

  // Fetch functions - Existing model
  const fetchCycles = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_cycles')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('Error fetching traffic cycles:', error);
    else setCycles((data || []) as TrafficCycle[]);
  }, []);

  const fetchRoutines = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_cycle_routines')
      .select('*')
      .order('frequency', { ascending: true });
    if (error) console.error('Error fetching routines:', error);
    else setRoutines((data || []) as TrafficCycleRoutine[]);
  }, []);

  const fetchRoutineTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_routine_tasks')
      .select('*')
      .order('task_order', { ascending: true });
    if (error) console.error('Error fetching routine tasks:', error);
    else setRoutineTasks((data || []) as TrafficRoutineTask[]);
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
    await Promise.all([
      fetchTrafficRoutines(),
      fetchRoutineCycles(),
      fetchCycles(),
      fetchRoutines(),
      fetchRoutineTasks(),
      fetchCycleTasks(),
      fetchPeriods(),
      fetchTasks(),
    ]);
    setLoading(false);
  }, [fetchTrafficRoutines, fetchRoutineCycles, fetchCycles, fetchRoutines, fetchRoutineTasks, fetchCycleTasks, fetchPeriods, fetchTasks]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // CRUD for Traffic Routines (Master)
  const addTrafficRoutine = async (routine: { name: string; description?: string }) => {
    const { data, error } = await supabase
      .from('traffic_routines')
      .insert([routine])
      .select()
      .single();
    if (error) {
      console.error('Error adding traffic routine:', error);
      return { data: null, error: error.message };
    }
    setTrafficRoutines((prev) => [...prev, data as TrafficRoutine].sort((a, b) => a.name.localeCompare(b.name)));
    return { data: data as TrafficRoutine, error: null };
  };

  const updateTrafficRoutine = async (id: string, updates: Partial<TrafficRoutine>) => {
    const { data, error } = await supabase
      .from('traffic_routines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating traffic routine:', error);
      return { data: null, error: error.message };
    }
    setTrafficRoutines((prev) =>
      prev.map((r) => (r.id === id ? (data as TrafficRoutine) : r)).sort((a, b) => a.name.localeCompare(b.name))
    );
    return { data: data as TrafficRoutine, error: null };
  };

  const deleteTrafficRoutine = async (id: string) => {
    const { error } = await supabase.from('traffic_routines').delete().eq('id', id);
    if (error) {
      console.error('Error deleting traffic routine:', error);
      return { error: error.message };
    }
    setTrafficRoutines((prev) => prev.filter((r) => r.id !== id));
    return { error: null };
  };

  const toggleTrafficRoutineActive = async (id: string) => {
    const routine = trafficRoutines.find((r) => r.id === id);
    if (!routine) return;
    await updateTrafficRoutine(id, { active: !routine.active });
  };

  // CRUD for Routine-Cycle junction
  const addRoutineCycle = async (data: {
    routine_id: string;
    cycle_id: string;
    frequency: RoutineFrequency;
    anchor_rule?: string;
    sort_order?: number;
  }) => {
    const { data: result, error } = await supabase
      .from('traffic_routine_cycles')
      .insert([data])
      .select()
      .single();
    if (error) {
      console.error('Error adding routine cycle:', error);
      return { data: null, error: error.message };
    }
    setRoutineCycles((prev) => [...prev, result as TrafficRoutineCycle].sort((a, b) => a.sort_order - b.sort_order));
    return { data: result as TrafficRoutineCycle, error: null };
  };

  const updateRoutineCycle = async (id: string, updates: Partial<TrafficRoutineCycle>) => {
    const { data, error } = await supabase
      .from('traffic_routine_cycles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating routine cycle:', error);
      return { data: null, error: error.message };
    }
    setRoutineCycles((prev) =>
      prev.map((rc) => (rc.id === id ? (data as TrafficRoutineCycle) : rc)).sort((a, b) => a.sort_order - b.sort_order)
    );
    return { data: data as TrafficRoutineCycle, error: null };
  };

  const deleteRoutineCycle = async (id: string) => {
    const { error } = await supabase.from('traffic_routine_cycles').delete().eq('id', id);
    if (error) {
      console.error('Error deleting routine cycle:', error);
      return { error: error.message };
    }
    setRoutineCycles((prev) => prev.filter((rc) => rc.id !== id));
    return { error: null };
  };

  const toggleRoutineCycleActive = async (id: string) => {
    const rc = routineCycles.find((r) => r.id === id);
    if (!rc) return;
    await updateRoutineCycle(id, { active: !rc.active });
  };

  // CRUD for Cycles (detailed activities)
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
    setCycles((prev) => [...prev, data as TrafficCycle].sort((a, b) => a.name.localeCompare(b.name)));
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
      prev.map((c) => (c.id === id ? (data as TrafficCycle) : c)).sort((a, b) => a.name.localeCompare(b.name))
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

  // CRUD for Cycle Routines (legacy)
  const addRoutine = async (routine: {
    cycle_id: string;
    name: string;
    frequency: RoutineFrequency;
    description?: string;
  }) => {
    const { data, error } = await supabase
      .from('traffic_cycle_routines')
      .insert([routine])
      .select()
      .single();
    if (error) {
      console.error('Error adding routine:', error);
      return { data: null, error: error.message };
    }
    setRoutines((prev) => [...prev, data as TrafficCycleRoutine]);
    return { data: data as TrafficCycleRoutine, error: null };
  };

  const updateRoutine = async (id: string, updates: Partial<TrafficCycleRoutine>) => {
    const { data, error } = await supabase
      .from('traffic_cycle_routines')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating routine:', error);
      return { data: null, error: error.message };
    }
    setRoutines((prev) => prev.map((r) => (r.id === id ? (data as TrafficCycleRoutine) : r)));
    return { data: data as TrafficCycleRoutine, error: null };
  };

  const deleteRoutine = async (id: string) => {
    const { error } = await supabase.from('traffic_cycle_routines').delete().eq('id', id);
    if (error) {
      console.error('Error deleting routine:', error);
      return { error: error.message };
    }
    setRoutines((prev) => prev.filter((r) => r.id !== id));
    return { error: null };
  };

  const toggleRoutineActive = async (id: string) => {
    const routine = routines.find((r) => r.id === id);
    if (!routine) return;
    await updateRoutine(id, { active: !routine.active });
  };

  // CRUD for Routine Tasks
  const addRoutineTask = async (
    task: Omit<TrafficRoutineTask, 'id' | 'created_at' | 'updated_at'>
  ) => {
    const { data, error } = await supabase
      .from('traffic_routine_tasks')
      .insert([task])
      .select()
      .single();
    if (error) {
      console.error('Error adding routine task:', error);
      return { data: null, error: error.message };
    }
    setRoutineTasks((prev) =>
      [...prev, data as TrafficRoutineTask].sort((a, b) => a.task_order - b.task_order)
    );
    return { data: data as TrafficRoutineTask, error: null };
  };

  const updateRoutineTask = async (id: string, updates: Partial<TrafficRoutineTask>) => {
    const { data, error } = await supabase
      .from('traffic_routine_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error('Error updating routine task:', error);
      return { data: null, error: error.message };
    }
    setRoutineTasks((prev) =>
      prev.map((t) => (t.id === id ? (data as TrafficRoutineTask) : t)).sort((a, b) => a.task_order - b.task_order)
    );
    return { data: data as TrafficRoutineTask, error: null };
  };

  const deleteRoutineTask = async (id: string) => {
    const { error } = await supabase.from('traffic_routine_tasks').delete().eq('id', id);
    if (error) {
      console.error('Error deleting routine task:', error);
      return { error: error.message };
    }
    setRoutineTasks((prev) => prev.filter((t) => t.id !== id));
    return { error: null };
  };

  // CRUD for Cycle Tasks
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

  // Generate tasks for a client's period (uses the new model)
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

    // Generate from cycle tasks
    const cycleTaskTemplates = cycleTasks.filter((t) => t.cycle_id === cycleId && t.active);
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
        routine_id: null,
      });
    }

    await fetchTasks();
    await fetchPeriods();

    return { success: true, period: periodResult.data };
  };

  // Getters - New model
  const getTrafficRoutineById = (id: string | null) => trafficRoutines.find((r) => r.id === id);
  const getActiveTrafficRoutines = () => trafficRoutines.filter((r) => r.active);
  const getRoutineCyclesByRoutine = (routineId: string) => 
    routineCycles.filter((rc) => rc.routine_id === routineId).sort((a, b) => a.sort_order - b.sort_order);
  const getActiveRoutineCyclesByRoutine = (routineId: string) =>
    routineCycles.filter((rc) => rc.routine_id === routineId && rc.active).sort((a, b) => a.sort_order - b.sort_order);

  // Getters - Existing model
  const getCycleById = (id: string | null) => cycles.find((c) => c.id === id);
  const getActiveCycles = () => cycles.filter((c) => c.active);
  const getRoutinesByCycle = (cycleId: string) => routines.filter((r) => r.cycle_id === cycleId);
  const getActiveRoutinesByCycle = (cycleId: string) =>
    routines.filter((r) => r.cycle_id === cycleId && r.active);
  const getRoutineById = (id: string | null) => routines.find((r) => r.id === id);
  const getRoutineTasksByRoutine = (routineId: string) =>
    routineTasks.filter((t) => t.routine_id === routineId).sort((a, b) => a.task_order - b.task_order);
  const getCycleTasksByCycle = (cycleId: string) =>
    cycleTasks.filter((t) => t.cycle_id === cycleId).sort((a, b) => a.task_order - b.task_order);
  const getPeriodsByClient = (clientId: string) => periods.filter((p) => p.client_id === clientId);
  const getActivePeriodByClient = (clientId: string) =>
    periods.find((p) => p.client_id === clientId && p.status === 'active');
  const getTasksByPeriod = (periodId: string) => tasks.filter((t) => t.period_id === periodId);
  const getTasksByClient = (clientId: string) => tasks.filter((t) => t.client_id === clientId);
  const getTasksByAssignee = (assigneeId: string) => tasks.filter((t) => t.assignee_id === assigneeId);
  const getTasksByRoutine = (routineId: string) => tasks.filter((t) => t.routine_id === routineId);

  // Metrics
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < today);
  const todayTasks = tasks.filter((t) => t.status !== 'done' && t.due_date === today);
  const openTasks = tasks.filter((t) => t.status !== 'done');
  const activePeriods = periods.filter((p) => p.status === 'active');

  return {
    // New model data
    trafficRoutines,
    routineCycles,
    // Existing model data
    cycles,
    routines,
    routineTasks,
    cycleTasks,
    periods,
    tasks,
    loading,
    // Traffic Routine CRUD (new master)
    addTrafficRoutine,
    updateTrafficRoutine,
    deleteTrafficRoutine,
    toggleTrafficRoutineActive,
    // Routine-Cycle junction CRUD
    addRoutineCycle,
    updateRoutineCycle,
    deleteRoutineCycle,
    toggleRoutineCycleActive,
    // Cycle CRUD
    addCycle,
    updateCycle,
    deleteCycle,
    toggleCycleActive,
    // Routine CRUD (legacy)
    addRoutine,
    updateRoutine,
    deleteRoutine,
    toggleRoutineActive,
    // Routine Task CRUD
    addRoutineTask,
    updateRoutineTask,
    deleteRoutineTask,
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
    // Getters - New model
    getTrafficRoutineById,
    getActiveTrafficRoutines,
    getRoutineCyclesByRoutine,
    getActiveRoutineCyclesByRoutine,
    // Getters - Existing model
    getCycleById,
    getActiveCycles,
    getRoutinesByCycle,
    getActiveRoutinesByCycle,
    getRoutineById,
    getRoutineTasksByRoutine,
    getCycleTasksByCycle,
    getPeriodsByClient,
    getActivePeriodByClient,
    getTasksByPeriod,
    getTasksByClient,
    getTasksByAssignee,
    getTasksByRoutine,
    // Metrics
    overdueTasks,
    todayTasks,
    openTasks,
    activePeriods,
    // Refetch
    refetch: fetchAll,
  };
}
