import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  SalesFunnelTarget, 
  SalesFunnelActual, 
  SalesFunnelKPI,
  FunnelFilters 
} from '@/types/salesFunnel';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, format, parseISO, endOfMonth } from 'date-fns';

// Client metrics derived from accounts table
export interface ClientMetricsByMonth {
  month: number; // 0-11
  sales_count: number;
  total_revenue: number;
  avg_ticket: number;
}

// Global metrics for base health
export interface BaseMetrics {
  avgLtMonths: number; // Average lifetime in months for active clients
  activeClientsCount: number;
}

export function useSalesFunnel(source: 'inbound' | 'outbound' = 'inbound') {
  const { toast } = useToast();
  const [targets, setTargets] = useState<SalesFunnelTarget[]>([]);
  const [actuals, setActuals] = useState<SalesFunnelActual[]>([]);
  const [kpis, setKpis] = useState<SalesFunnelKPI[]>([]);
  const [clientMetrics, setClientMetrics] = useState<ClientMetricsByMonth[]>([]);
  const [baseMetrics, setBaseMetrics] = useState<BaseMetrics>({ avgLtMonths: 0, activeClientsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  
  const [filters, setFilters] = useState<FunnelFilters>({
    year: new Date().getFullYear(),
    source,
  });

  // Check if user can edit
  useEffect(() => {
    const checkPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setCanEdit(false);
        return;
      }

      // Check if admin using is_admin function or has commercial edit role
      const { data: isAdminData } = await supabase.rpc('is_admin', { 
        _auth_user_id: user.id 
      });
      
      if (isAdminData) {
        setCanEdit(true);
        return;
      }

      // Check commercial role
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

  const fetchTargets = useCallback(async () => {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    
    const { data, error } = await supabase
      .from('petron_sales_funnel_targets')
      .select('*')
      .eq('source', source)
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching targets:', error);
      return;
    }

    setTargets(data || []);
  }, [filters.year, source]);

  const fetchActuals = useCallback(async () => {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    
    const { data, error } = await supabase
      .from('petron_sales_funnel_actuals')
      .select('*')
      .eq('source', source)
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching actuals:', error);
      return;
    }

    setActuals(data || []);
  }, [filters.year, source]);

  const fetchKpis = useCallback(async () => {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    
    const { data, error } = await supabase
      .from('petron_sales_funnel_kpis_monthly')
      .select('*')
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching KPIs:', error);
      return;
    }

    setKpis((data || []) as SalesFunnelKPI[]);
  }, [filters.year]);

  // Fetch client metrics from accounts table (sales, revenue, ticket)
  const fetchClientMetrics = useCallback(async () => {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    
    const { data, error } = await supabase
      .from('accounts')
      .select('start_date, monthly_value')
      .gte('start_date', startDate)
      .lte('start_date', endDate)
      .is('deleted_at', null)
      .or('cliente_interno.is.null,cliente_interno.eq.false');

    if (error) {
      console.error('Error fetching client metrics:', error);
      return;
    }

    // Group by month and calculate metrics
    const metricsByMonth: ClientMetricsByMonth[] = Array.from({ length: 12 }, (_, i) => ({
      month: i,
      sales_count: 0,
      total_revenue: 0,
      avg_ticket: 0,
    }));

    (data || []).forEach(account => {
      if (account.start_date) {
        const monthIndex = parseISO(account.start_date).getMonth();
        metricsByMonth[monthIndex].sales_count += 1;
        metricsByMonth[monthIndex].total_revenue += account.monthly_value || 0;
      }
    });

    // Calculate avg ticket
    metricsByMonth.forEach(m => {
      m.avg_ticket = m.sales_count > 0 ? m.total_revenue / m.sales_count : 0;
    });

    setClientMetrics(metricsByMonth);
  }, [filters.year]);

  // Fetch average LT for active clients (for ROAS Expectativa calculation)
  const fetchBaseMetrics = useCallback(async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('start_date')
      .eq('status', 'active')
      .is('deleted_at', null)
      .or('cliente_interno.is.null,cliente_interno.eq.false')
      .not('start_date', 'is', null);

    if (error) {
      console.error('Error fetching base metrics:', error);
      return;
    }

    if (!data || data.length === 0) {
      setBaseMetrics({ avgLtMonths: 0, activeClientsCount: 0 });
      return;
    }

    const now = new Date();
    let totalMonths = 0;
    let validCount = 0;

    data.forEach(account => {
      if (account.start_date) {
        const startDate = parseISO(account.start_date);
        const diffMs = now.getTime() - startDate.getTime();
        const months = diffMs / (1000 * 60 * 60 * 24 * 30.44); // Average days per month
        if (months > 0) {
          totalMonths += months;
          validCount++;
        }
      }
    });

    const avgLtMonths = validCount > 0 ? totalMonths / validCount : 0;
    setBaseMetrics({ avgLtMonths, activeClientsCount: validCount });
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTargets(), fetchActuals(), fetchKpis(), fetchClientMetrics(), fetchBaseMetrics()]);
    setLoading(false);
  }, [fetchTargets, fetchActuals, fetchKpis, fetchClientMetrics, fetchBaseMetrics]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveTarget = async (month: Date, data: Partial<SalesFunnelTarget>): Promise<boolean> => {
    const normalizedMonth = format(startOfMonth(month), 'yyyy-MM-dd');
    
    // Check if exists
    const existing = targets.find(t => t.month === normalizedMonth);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    const payload = {
      ...data,
      month: normalizedMonth,
      created_by: user?.id,
    };
    
    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('petron_sales_funnel_targets')
        .update(payload)
        .eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('petron_sales_funnel_targets')
        .insert(payload);
      error = insertError;
    }

    if (error) {
      console.error('Error saving target:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({ title: 'Meta salva com sucesso!' });
    await fetchAll();
    return true;
  };

  const saveActual = async (month: Date, data: Partial<SalesFunnelActual>): Promise<boolean> => {
    const normalizedMonth = format(startOfMonth(month), 'yyyy-MM-dd');
    
    const existing = actuals.find(a => a.month === normalizedMonth);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    // Auto-calculate derived fields if not provided
    const payload: Partial<SalesFunnelActual> & { month: string; created_by?: string } = {
      ...data,
      month: normalizedMonth,
      created_by: user?.id ?? undefined,
    };

    // Calculate CPL if empty
    if (!payload.cpl_actual && payload.investment_actual && payload.leads_actual) {
      payload.cpl_actual = payload.investment_actual / payload.leads_actual;
    }

    // Calculate revenue if empty
    if (!payload.revenue_actual && payload.sales_actual && payload.avg_ticket_actual) {
      payload.revenue_actual = payload.sales_actual * payload.avg_ticket_actual;
    }

    // Calculate ROAS if empty
    if (!payload.roas_actual && payload.revenue_actual && payload.investment_actual) {
      payload.roas_actual = payload.revenue_actual / payload.investment_actual;
    }
    
    let error;
    if (existing) {
      const { error: updateError } = await supabase
        .from('petron_sales_funnel_actuals')
        .update(payload)
        .eq('id', existing.id);
      error = updateError;
    } else {
      const { error: insertError } = await supabase
        .from('petron_sales_funnel_actuals')
        .insert(payload as never);
      error = insertError;
    }

    if (error) {
      console.error('Error saving actual:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }

    toast({ title: 'Realizado salvo com sucesso!' });
    await fetchAll();
    return true;
  };

  const getTargetForMonth = (month: Date): SalesFunnelTarget | undefined => {
    const normalizedMonth = format(startOfMonth(month), 'yyyy-MM-dd');
    return targets.find(t => t.month === normalizedMonth);
  };

  const getActualForMonth = (month: Date): SalesFunnelActual | undefined => {
    const normalizedMonth = format(startOfMonth(month), 'yyyy-MM-dd');
    return actuals.find(a => a.month === normalizedMonth);
  };

  // Get client metrics for a specific month
  const getClientMetricsForMonth = (monthIndex: number): ClientMetricsByMonth | undefined => {
    return clientMetrics.find(m => m.month === monthIndex);
  };

  return {
    targets,
    actuals,
    kpis,
    clientMetrics,
    baseMetrics,
    loading,
    canEdit,
    filters,
    setFilters,
    saveTarget,
    saveActual,
    getTargetForMonth,
    getActualForMonth,
    getClientMetricsForMonth,
    refetch: fetchAll,
  };
}
