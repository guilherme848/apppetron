import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SalesDeal, SalesActivity } from '@/types/sales';

export interface DealEvent {
  id: string;
  deal_id: string;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  user_id: string | null;
  created_at: string;
}

export interface DealFile {
  id: string;
  deal_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  public_url: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export function useDealDetail(dealId: string | undefined) {
  const [deal, setDeal] = useState<any>(null);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [events, setEvents] = useState<DealEvent[]>([]);
  const [files, setFiles] = useState<DealFile[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [funnel, setFunnel] = useState<any>(null);
  const [adjacentDeals, setAdjacentDeals] = useState<{ prev: string | null; next: string | null }>({ prev: null, next: null });
  const [loading, setLoading] = useState(true);

  const fetchDeal = useCallback(async () => {
    if (!dealId) return;
    const { data } = await supabase
      .from('crm_deals')
      .select('*, crm_contacts(*), team_members(id, name, avatar_url)')
      .eq('id', dealId)
      .single();
    if (data) {
      const mapped = {
        ...(data as any),
        contact: (data as any).crm_contacts || null,
        responsible: (data as any).team_members || null,
        tags: (data as any).tags || [],
      };
      setDeal(mapped);

      // Fetch funnel & stages
      const { data: funnelData } = await supabase
        .from('crm_funnels')
        .select('*')
        .eq('id', mapped.funnel_id)
        .single();
      setFunnel(funnelData);

      const { data: stagesData } = await supabase
        .from('crm_funnel_stages')
        .select('*')
        .eq('funnel_id', mapped.funnel_id)
        .order('sort_order');
      setStages((stagesData as any[]) || []);

      // Adjacent deals in same funnel
      const { data: allDeals } = await supabase
        .from('crm_deals')
        .select('id')
        .eq('funnel_id', mapped.funnel_id)
        .eq('status', 'open')
        .order('created_at', { ascending: false });
      if (allDeals) {
        const idx = allDeals.findIndex((d: any) => d.id === dealId);
        setAdjacentDeals({
          prev: idx > 0 ? allDeals[idx - 1].id : null,
          next: idx < allDeals.length - 1 ? allDeals[idx + 1].id : null,
        });
      }
    }
  }, [dealId]);

  const fetchActivities = useCallback(async () => {
    if (!dealId) return;
    const { data } = await supabase
      .from('crm_activities')
      .select('*, team_members(id, name)')
      .eq('deal_id', dealId)
      .order('scheduled_at', { ascending: true });
    setActivities(((data as any[]) || []).map((a: any) => ({
      ...a,
      responsible: a.team_members || null,
    })));
  }, [dealId]);

  const fetchEvents = useCallback(async () => {
    if (!dealId) return;
    const { data } = await supabase
      .from('crm_deal_events')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    setEvents((data as any[]) || []);
  }, [dealId]);

  const fetchFiles = useCallback(async () => {
    if (!dealId) return;
    const { data } = await supabase
      .from('crm_deal_files')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });
    setFiles((data as any[]) || []);
  }, [dealId]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDeal(), fetchActivities(), fetchEvents(), fetchFiles()]);
    setLoading(false);
  }, [fetchDeal, fetchActivities, fetchEvents, fetchFiles]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime events
  useEffect(() => {
    if (!dealId) return;
    const channel = supabase
      .channel(`deal-events-${dealId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'crm_deal_events', filter: `deal_id=eq.${dealId}` }, () => {
        fetchEvents();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [dealId, fetchEvents]);

  const changeStage = async (newStageId: string) => {
    if (!deal) return;
    const fromStage = stages.find(s => s.id === deal.stage_id);
    const toStage = stages.find(s => s.id === newStageId);
    const { error } = await supabase.from('crm_deals').update({ stage_id: newStageId } as any).eq('id', deal.id);
    if (!error) {
      await supabase.from('crm_deal_stage_history').insert({ deal_id: deal.id, from_stage_id: deal.stage_id, to_stage_id: newStageId, changed_at: new Date().toISOString() } as any);
      await supabase.from('crm_deal_events').insert({
        deal_id: deal.id,
        event_type: 'stage_changed',
        title: 'Etapa alterada',
        description: `De "${fromStage?.name || '?'}" para "${toStage?.name || '?'}"`,
        metadata: { from_stage_id: deal.stage_id, to_stage_id: newStageId },
      } as any);
      await fetchDeal();
    }
    return !error;
  };

  const updateDealField = async (field: string, value: any, label?: string) => {
    const oldValue = (deal as any)?.[field];
    const { error } = await supabase.from('crm_deals').update({ [field]: value } as any).eq('id', deal.id);
    if (!error) {
      if (label) {
        await supabase.from('crm_deal_events').insert({
          deal_id: deal.id,
          event_type: 'field_changed',
          title: `${label} alterado`,
          description: `De "${oldValue || '—'}" para "${value || '—'}"`,
          metadata: { field, old_value: oldValue, new_value: value },
        } as any);
      }
      await fetchDeal();
    }
    return !error;
  };

  const updateContact = async (field: string, value: any) => {
    if (!deal?.contact_id) return false;
    const { error } = await supabase.from('crm_contacts').update({ [field]: value } as any).eq('id', deal.contact_id);
    if (!error) await fetchDeal();
    return !error;
  };

  const uploadFile = async (file: File) => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `deals/${dealId}/${Date.now()}_${safeName}`;
    const { error: uploadError } = await supabase.storage.from('crm-files').upload(path, file);
    if (uploadError) return false;
    const { data: urlData } = supabase.storage.from('crm-files').getPublicUrl(path);
    await supabase.from('crm_deal_files').insert({
      deal_id: dealId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      storage_path: path,
      public_url: urlData.publicUrl,
    } as any);
    await fetchFiles();
    return true;
  };

  const deleteFile = async (fileId: string, storagePath: string) => {
    await supabase.storage.from('crm-files').remove([storagePath]);
    await supabase.from('crm_deal_files').delete().eq('id', fileId);
    await fetchFiles();
  };

  return {
    deal, activities, events, files, stages, funnel, adjacentDeals, loading,
    changeStage, updateDealField, updateContact, uploadFile, deleteFile,
    refetchDeal: fetchDeal, refetchActivities: fetchActivities, refetchEvents: fetchEvents, refetchFiles: fetchFiles,
  };
}
