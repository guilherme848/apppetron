import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  SalesFunnelTarget, 
  SalesFunnelActual, 
  SalesFunnelKPI,
  FunnelFilters 
} from '@/types/salesFunnel';
import { useToast } from '@/hooks/use-toast';
import { startOfMonth, format, parseISO } from 'date-fns';

export function useSalesFunnel() {
  const { toast } = useToast();
  const [targets, setTargets] = useState<SalesFunnelTarget[]>([]);
  const [actuals, setActuals] = useState<SalesFunnelActual[]>([]);
  const [kpis, setKpis] = useState<SalesFunnelKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  
  const [filters, setFilters] = useState<FunnelFilters>({
    year: new Date().getFullYear(),
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
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching targets:', error);
      return;
    }

    setTargets(data || []);
  }, [filters.year]);

  const fetchActuals = useCallback(async () => {
    const startDate = `${filters.year}-01-01`;
    const endDate = `${filters.year}-12-31`;
    
    const { data, error } = await supabase
      .from('petron_sales_funnel_actuals')
      .select('*')
      .gte('month', startDate)
      .lte('month', endDate)
      .order('month', { ascending: true });

    if (error) {
      console.error('Error fetching actuals:', error);
      return;
    }

    setActuals(data || []);
  }, [filters.year]);

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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchTargets(), fetchActuals(), fetchKpis()]);
    setLoading(false);
  }, [fetchTargets, fetchActuals, fetchKpis]);

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

  return {
    targets,
    actuals,
    kpis,
    loading,
    canEdit,
    filters,
    setFilters,
    saveTarget,
    saveActual,
    getTargetForMonth,
    getActualForMonth,
    refetch: fetchAll,
  };
}
