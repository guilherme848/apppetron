import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';

export interface CrmGoal {
  id: string;
  user_id: string;
  month: string;
  deals_target: number;
  value_target: number;
  activities_target: number;
  calls_target: number;
}

export interface CrmGoalAchievement {
  id: string;
  user_id: string;
  month: string;
  deals_done: number;
  value_done: number;
  activities_done: number;
  calls_done: number;
}

export function useCrmGoals(selectedMonth?: Date) {
  const [goals, setGoals] = useState<CrmGoal[]>([]);
  const [achievements, setAchievements] = useState<CrmGoalAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const monthStr = format(selectedMonth || new Date(), 'yyyy-MM-01');

  const fetchGoals = useCallback(async () => {
    const { data } = await supabase
      .from('crm_goals')
      .select('*')
      .eq('month', monthStr);
    setGoals((data as any[]) || []);
  }, [monthStr]);

  const fetchAchievements = useCallback(async () => {
    const { data } = await supabase
      .from('crm_goal_achievements')
      .select('*')
      .eq('month', monthStr);
    setAchievements((data as any[]) || []);
  }, [monthStr]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchGoals(), fetchAchievements()]);
      setLoading(false);
    };
    load();
  }, [fetchGoals, fetchAchievements]);

  // Realtime subscription for achievements
  useEffect(() => {
    const channel = supabase
      .channel('goal-achievements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_goal_achievements' }, () => {
        fetchAchievements();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAchievements]);

  const upsertGoal = async (userId: string, data: Partial<CrmGoal>) => {
    const existing = goals.find(g => g.user_id === userId);
    if (existing) {
      await supabase.from('crm_goals').update({ ...data, updated_at: new Date().toISOString() } as any).eq('id', existing.id);
    } else {
      await supabase.from('crm_goals').insert({ user_id: userId, month: monthStr, ...data } as any);
    }
    await fetchGoals();
  };

  const getGoalForUser = (userId: string) => goals.find(g => g.user_id === userId);
  const getAchievementForUser = (userId: string) => achievements.find(a => a.user_id === userId);

  const getRanking = () => {
    return goals
      .map(g => {
        const ach = achievements.find(a => a.user_id === g.user_id);
        const valuePct = g.value_target > 0 ? ((ach?.value_done || 0) / g.value_target) * 100 : 0;
        const dealsPct = g.deals_target > 0 ? ((ach?.deals_done || 0) / g.deals_target) * 100 : 0;
        return {
          user_id: g.user_id,
          goal: g,
          achievement: ach,
          valuePct,
          dealsPct,
          avgPct: (valuePct + dealsPct) / 2,
        };
      })
      .sort((a, b) => b.avgPct - a.avgPct);
  };

  return {
    goals, achievements, loading,
    upsertGoal, getGoalForUser, getAchievementForUser, getRanking,
    refetch: () => Promise.all([fetchGoals(), fetchAchievements()]),
  };
}
