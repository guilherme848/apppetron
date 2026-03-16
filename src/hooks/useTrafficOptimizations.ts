import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TrafficOptimization {
  id: string;
  client_id: string;
  member_id: string | null;
  platform: string;
  task_type: string;
  description: string | null;
  tempo_gasto_minutos: number;
  checkin_saldo_ok: boolean | null;
  checkin_campanhas_rodando: boolean | null;
  checkin_alertas: boolean | null;
  optimization_date: string;
  created_at: string;
  updated_at: string;
}

export interface WeeklyCycleEntry {
  id: string;
  client_id: string;
  manager_member_id: string;
  weekday: number;
  sort_order: number;
  created_at: string;
}

export type OptimizationInput = {
  client_id: string;
  member_id?: string | null;
  platform: string;
  task_type: string;
  description?: string;
  tempo_gasto_minutos: number;
  checkin_saldo_ok?: boolean;
  checkin_campanhas_rodando?: boolean;
  checkin_alertas?: boolean;
  optimization_date: string;
};

export const PLATFORM_OPTIONS = [
  { value: 'meta_ads', label: 'Meta Ads' },
  { value: 'google_ads', label: 'Google Ads' },
];

export const TASK_TYPE_OPTIONS = [
  { value: 'checkin', label: 'Check-in Diário', complexity: 'Leve', minutes: 5 },
  { value: 'media', label: 'Média Complexidade', complexity: 'Média', minutes: 30 },
  { value: 'alta', label: 'Alta Complexidade', complexity: 'Alta', minutes: 60 },
];

export function useTrafficOptimizations() {
  const { user, isAdmin } = useAuth();
  const [optimizations, setOptimizations] = useState<TrafficOptimization[]>([]);
  const [weeklyCycle, setWeeklyCycle] = useState<WeeklyCycleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  // Get current member
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('team_members')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCurrentMemberId(data.id);
      });
  }, [user?.id]);

  const fetchOptimizations = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_optimizations')
      .select('*')
      .order('optimization_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching optimizations:', error);
    else setOptimizations((data || []) as TrafficOptimization[]);
  }, []);

  const fetchWeeklyCycle = useCallback(async () => {
    const { data, error } = await supabase
      .from('traffic_optimization_weekly_cycle')
      .select('*')
      .order('weekday', { ascending: true })
      .order('sort_order', { ascending: true });
    if (error) console.error('Error fetching weekly cycle:', error);
    else setWeeklyCycle((data || []) as WeeklyCycleEntry[]);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchOptimizations(), fetchWeeklyCycle()]);
    setLoading(false);
  }, [fetchOptimizations, fetchWeeklyCycle]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // CRUD Optimizations
  const addOptimization = async (input: OptimizationInput) => {
    const payload = { ...input, member_id: input.member_id || currentMemberId };
    const { data, error } = await supabase
      .from('traffic_optimizations')
      .insert([payload])
      .select()
      .single();
    if (error) {
      toast.error('Erro ao registrar otimização');
      return { data: null, error };
    }
    setOptimizations((prev) => [data as TrafficOptimization, ...prev]);
    toast.success('Otimização registrada');
    return { data: data as TrafficOptimization, error: null };
  };

  const updateOptimization = async (id: string, updates: Partial<OptimizationInput>) => {
    const { data, error } = await supabase
      .from('traffic_optimizations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao atualizar otimização');
      return { data: null, error };
    }
    setOptimizations((prev) => prev.map((o) => (o.id === id ? (data as TrafficOptimization) : o)));
    toast.success('Otimização atualizada');
    return { data: data as TrafficOptimization, error: null };
  };

  const deleteOptimization = async (id: string) => {
    const { error } = await supabase.from('traffic_optimizations').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir otimização');
      return { error };
    }
    setOptimizations((prev) => prev.filter((o) => o.id !== id));
    toast.success('Otimização excluída');
    return { error: null };
  };

  // Weekly Cycle CRUD
  const addWeeklyCycleEntry = async (client_id: string, weekday: number) => {
    if (!currentMemberId) return { error: 'Membro não encontrado' };
    const maxSort = weeklyCycle
      .filter((w) => w.weekday === weekday && w.manager_member_id === currentMemberId)
      .reduce((max, w) => Math.max(max, w.sort_order), -1);
    const { data, error } = await supabase
      .from('traffic_optimization_weekly_cycle')
      .insert([{ client_id, manager_member_id: currentMemberId, weekday, sort_order: maxSort + 1 }])
      .select()
      .single();
    if (error) {
      toast.error('Erro ao adicionar cliente ao ciclo');
      return { error };
    }
    setWeeklyCycle((prev) => [...prev, data as WeeklyCycleEntry]);
    return { data, error: null };
  };

  const removeWeeklyCycleEntry = async (id: string) => {
    const { error } = await supabase.from('traffic_optimization_weekly_cycle').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover do ciclo');
      return { error };
    }
    setWeeklyCycle((prev) => prev.filter((w) => w.id !== id));
    return { error: null };
  };

  const moveWeeklyCycleEntry = async (id: string, newWeekday: number) => {
    const { data, error } = await supabase
      .from('traffic_optimization_weekly_cycle')
      .update({ weekday: newWeekday })
      .eq('id', id)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao mover cliente');
      return { error };
    }
    setWeeklyCycle((prev) => prev.map((w) => (w.id === id ? (data as WeeklyCycleEntry) : w)));
    return { data, error: null };
  };

  // Today's pending check-ins (clients assigned to current member that haven't been checked in today)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const todayCheckins = useMemo(() => {
    return optimizations.filter(
      (o) => o.optimization_date === todayStr && o.task_type === 'checkin' && (isAdmin || o.member_id === currentMemberId)
    );
  }, [optimizations, todayStr, currentMemberId, isAdmin]);

  const todayWeekday = useMemo(() => {
    const d = new Date().getDay(); // 0=Sun, 1=Mon...
    return d === 0 ? 1 : d; // Map Sunday to Monday
  }, []);

  const todayHighComplexity = useMemo(() => {
    if (!isAdmin && !currentMemberId) return [];
    return weeklyCycle.filter(
      (w) => w.weekday === todayWeekday && (isAdmin || w.manager_member_id === currentMemberId)
    );
  }, [weeklyCycle, todayWeekday, currentMemberId, isAdmin]);

  const openMediumTasks = useMemo(() => {
    return optimizations.filter(
      (o) => o.task_type === 'media' && (isAdmin || o.member_id === currentMemberId)
    );
  }, [optimizations, currentMemberId, isAdmin]);

  return {
    optimizations,
    weeklyCycle,
    loading,
    currentMemberId,
    todayStr,
    todayCheckins,
    todayHighComplexity,
    todayWeekday,
    openMediumTasks,
    addOptimization,
    updateOptimization,
    deleteOptimization,
    addWeeklyCycleEntry,
    removeWeeklyCycleEntry,
    moveWeeklyCycleEntry,
    refetch: fetchAll,
  };
}
