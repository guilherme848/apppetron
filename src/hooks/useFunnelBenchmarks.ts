import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FunnelBenchmark {
  id: string;
  metric_key: string;
  metric_label: string;
  bad_threshold: number;
  regular_threshold: number;
  good_threshold: number;
  is_percentage: boolean;
  is_higher_better: boolean;
  created_at: string;
  updated_at: string;
}

export function useFunnelBenchmarks() {
  const { toast } = useToast();
  const [benchmarks, setBenchmarks] = useState<FunnelBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  // Check edit permission
  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanEdit(false);
        return;
      }

      const { data: isAdminData } = await supabase.rpc('is_admin', { 
        _auth_user_id: user.id 
      });
      
      if (isAdminData) {
        setCanEdit(true);
        return;
      }

      const { data: roleData } = await supabase
        .from('commercial_user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'commercial_manager'])
        .maybeSingle();
      
      setCanEdit(!!roleData);
    };

    checkPermissions();
  }, []);

  const fetchBenchmarks = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('petron_funnel_benchmarks')
      .select('*')
      .order('metric_key');

    if (error) {
      console.error('Error fetching benchmarks:', error);
      toast({
        title: 'Erro ao carregar benchmarks',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setBenchmarks(data || []);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  const updateBenchmark = async (
    id: string, 
    data: Partial<Pick<FunnelBenchmark, 'bad_threshold' | 'regular_threshold' | 'good_threshold'>>
  ): Promise<boolean> => {
    const { error } = await supabase
      .from('petron_funnel_benchmarks')
      .update(data)
      .eq('id', id);

    if (error) {
      console.error('Error updating benchmark:', error);
      toast({
        title: 'Erro ao atualizar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({ title: 'Benchmark atualizado!' });
    await fetchBenchmarks();
    return true;
  };

  // Get benchmark by metric key
  const getBenchmarkForMetric = (metricKey: string): FunnelBenchmark | undefined => {
    // Map actual metric keys to benchmark keys
    const keyMap: Record<string, string> = {
      'rate_scheduling_actual': 'rate_scheduling',
      'rate_attendance_actual': 'rate_attendance',
      'rate_close_actual': 'rate_close',
      'roas_actual': 'roas',
    };
    const mappedKey = keyMap[metricKey] || metricKey;
    return benchmarks.find(b => b.metric_key === mappedKey);
  };

  // Determine level based on value and thresholds
  const getValueLevel = (
    metricKey: string, 
    value: number | null
  ): 'bad' | 'regular' | 'good' | null => {
    if (value === null) return null;
    
    const benchmark = getBenchmarkForMetric(metricKey);
    if (!benchmark) return null;

    if (benchmark.is_higher_better) {
      if (value >= benchmark.good_threshold) return 'good';
      if (value >= benchmark.regular_threshold) return 'regular';
      return 'bad';
    } else {
      if (value <= benchmark.good_threshold) return 'good';
      if (value <= benchmark.regular_threshold) return 'regular';
      return 'bad';
    }
  };

  return {
    benchmarks,
    loading,
    canEdit,
    updateBenchmark,
    getBenchmarkForMetric,
    getValueLevel,
    refetch: fetchBenchmarks,
  };
}
