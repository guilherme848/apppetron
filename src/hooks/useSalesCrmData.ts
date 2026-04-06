import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SalesFunnel, SalesFunnelStage, SalesDeal, SalesContact, SalesActivity } from '@/types/sales';

export function useSalesCrmData() {
  const [funnels, setFunnels] = useState<SalesFunnel[]>([]);
  const [stages, setStages] = useState<SalesFunnelStage[]>([]);
  const [deals, setDeals] = useState<SalesDeal[]>([]);
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFunnels = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_funnels')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('[CRM] Error fetching funnels:', error);
    setFunnels((data as any[]) || []);
  }, []);

  const fetchStages = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_funnel_stages')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) console.error('[CRM] Error fetching stages:', error);
    setStages((data as any[]) || []);
  }, []);

  const fetchDeals = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_deals')
      .select('*, crm_contacts(*), team_members(id, name, avatar_url)')
      .order('created_at', { ascending: false });
    if (error) console.error('[CRM] Error fetching deals:', error);
    const mapped = ((data as any[]) || []).map((d: any) => ({
      ...d,
      tags: d.tags || [],
      contact: d.crm_contacts || null,
      responsible: d.team_members || null,
    }));
    setDeals(mapped);
  }, []);

  const fetchContacts = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error('[CRM] Error fetching contacts:', error);
    setContacts(((data as any[]) || []).map((c: any) => ({ ...c, tags: c.tags || [] })));
  }, []);

  const fetchActivities = useCallback(async () => {
    const { data, error } = await supabase
      .from('crm_activities')
      .select('*, crm_deals(id, title, funnel_id, stage_id), crm_contacts(id, name, company), team_members(id, name)')
      .order('scheduled_at', { ascending: true });
    if (error) console.error('[CRM] Error fetching activities:', error);
    const mapped = ((data as any[]) || []).map((a: any) => ({
      ...a,
      deal: a.crm_deals || null,
      contact: a.crm_contacts || null,
      responsible: a.team_members || null,
    }));
    setActivities(mapped);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchFunnels(), fetchStages(), fetchDeals(), fetchContacts(), fetchActivities()]);
    setLoading(false);
  }, [fetchFunnels, fetchStages, fetchDeals, fetchContacts, fetchActivities]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // --- KPI helpers ---
  const openDeals = deals.filter(d => d.status === 'open');
  const totalPipelineValue = openDeals.reduce((s, d) => s + Number(d.value || 0), 0);

  const today = new Date().toISOString().split('T')[0];
  const todayActivities = activities.filter(a => a.scheduled_at?.startsWith(today));
  const todayCompleted = todayActivities.filter(a => a.status === 'completed').length;
  const overdueActivities = activities.filter(a =>
    a.status === 'pending' && a.scheduled_at && a.scheduled_at < new Date().toISOString()
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthDeals = deals.filter(d => d.created_at >= monthStart);
  const wonThisMonth = monthDeals.filter(d => d.status === 'won').length;
  const closedThisMonth = monthDeals.filter(d => d.status === 'won' || d.status === 'lost').length;
  const conversionRate = closedThisMonth > 0 ? (wonThisMonth / closedThisMonth) * 100 : 0;

  const getStagesByFunnel = (funnelId: string) =>
    stages.filter(s => s.funnel_id === funnelId).sort((a, b) => a.sort_order - b.sort_order);

  const getDealsByFunnel = (funnelId: string) =>
    deals.filter(d => d.funnel_id === funnelId && d.status === 'open');

  const getDealsByStage = (stageId: string) =>
    deals.filter(d => d.stage_id === stageId && d.status === 'open');

  return {
    funnels, stages, deals, contacts, activities, loading,
    openDeals, totalPipelineValue,
    todayActivities, todayCompleted, overdueActivities,
    conversionRate, wonThisMonth,
    getStagesByFunnel, getDealsByFunnel, getDealsByStage,
    refetch: fetchAll,
    refetchDeals: fetchDeals,
    refetchActivities: fetchActivities,
    refetchContacts: fetchContacts,
    refetchFunnels: fetchFunnels,
    refetchStages: fetchStages,
  };
}
