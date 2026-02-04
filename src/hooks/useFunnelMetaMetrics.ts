import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, format } from 'date-fns';

export interface FunnelMetaMetrics {
  month: string; // yyyy-MM-dd
  investment: number;
  leads: number;
  cpl: number; // calculated: investment / leads
}

export function useFunnelMetaMetrics(year: number, selectedAdAccountIds: string[] = []) {
  const [metrics, setMetrics] = useState<FunnelMetaMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      
      // Build query
      let query = supabase
        .from('ad_account_metrics_daily')
        .select('ad_account_id, date, metrics_json')
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('platform', 'meta');

      // Filter by selected ad accounts if any are selected
      if (selectedAdAccountIds.length > 0) {
        query = query.in('ad_account_id', selectedAdAccountIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Meta metrics:', error);
        setMetrics([]);
        return;
      }

      // Get latest sync time
      const { data: latestRow } = await supabase
        .from('ad_account_metrics_daily')
        .select('created_at')
        .eq('platform', 'meta')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestRow?.created_at) {
        setLastSync(new Date(latestRow.created_at));
      }

      // Aggregate by month
      const monthlyData: Record<string, { investment: number; leads: number }> = {};

      // Initialize all months
      for (let m = 0; m < 12; m++) {
        const monthDate = new Date(year, m, 1);
        const monthKey = format(monthDate, 'yyyy-MM-dd');
        monthlyData[monthKey] = { investment: 0, leads: 0 };
      }

      // Aggregate data
      (data || []).forEach(row => {
        const rowDate = new Date(row.date);
        const monthKey = format(startOfMonth(rowDate), 'yyyy-MM-dd');
        
        const metricsJson = row.metrics_json as {
          spend?: number;
          leads?: number;
        } | null;

        if (metricsJson && monthlyData[monthKey]) {
          monthlyData[monthKey].investment += metricsJson.spend || 0;
          monthlyData[monthKey].leads += metricsJson.leads || 0;
        }
      });

      // Convert to array with calculated CPL
      const result: FunnelMetaMetrics[] = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        investment: data.investment,
        leads: data.leads,
        cpl: data.leads > 0 ? data.investment / data.leads : 0,
      }));

      setMetrics(result);
    } catch (err) {
      console.error('Error in useFunnelMetaMetrics:', err);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [year, selectedAdAccountIds]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const getMetricsForMonth = (monthDate: Date): FunnelMetaMetrics | undefined => {
    const monthKey = format(startOfMonth(monthDate), 'yyyy-MM-dd');
    return metrics.find(m => m.month === monthKey);
  };

  return {
    metrics,
    loading,
    lastSync,
    getMetricsForMonth,
    refetch: fetchMetrics,
  };
}
