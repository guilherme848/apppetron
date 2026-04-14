import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Period = '1d' | '7d' | '30d' | 'mtd' | 'last_month' | '90d' | 'ytd';

export const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: '1d', label: 'Hoje' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'mtd', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'ytd', label: 'Este ano' },
];

export interface CampaignMetrics {
  spend: number;
  leads: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpl: number;
  whatsapp_conversations: number;
  messaging_replies: number;
  cost_per_conversation: number;
}

export interface ClientMonitoringRow {
  client_id: string;
  client_name: string;
  ad_account_id: string;
  ad_account_name: string | null;
  niche: string | null;
  current: CampaignMetrics;
  previous: CampaignMetrics;
  delta: { spend: number; leads: number; cpl: number; conversations: number; cost_per_conversation: number };
  health: 'green' | 'yellow' | 'red';
  last_sync_at: string | null;
}

export interface CampaignMonitoringRow {
  campaign_id: string;
  campaign_name: string;
  ad_account_id: string;
  effective_status: string | null;
  daily_budget: number | null;
  current: CampaignMetrics;
  previous: CampaignMetrics;
  delta: { spend: number; leads: number; cpl: number; conversations: number; cost_per_conversation: number };
  health: 'green' | 'yellow' | 'red';
}

const FIXED_DAYS: Partial<Record<Period, number>> = { '1d': 1, '7d': 7, '30d': 30, '90d': 90 };

function emptyMetrics(): CampaignMetrics {
  return { spend: 0, leads: 0, impressions: 0, clicks: 0, ctr: 0, cpl: 0, whatsapp_conversations: 0, messaging_replies: 0, cost_per_conversation: 0 };
}

function sumMetrics(rows: Array<{ metrics_json: any }>): CampaignMetrics {
  const m = emptyMetrics();
  for (const r of rows) {
    const j = r.metrics_json || {};
    m.spend += Number(j.spend) || 0;
    m.leads += Number(j.leads) || 0;
    m.impressions += Number(j.impressions) || 0;
    m.clicks += Number(j.clicks) || 0;
    m.whatsapp_conversations += Number(j.whatsapp_conversations) || 0;
    m.messaging_replies += Number(j.messaging_replies) || 0;
  }
  m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  m.cpl = m.leads > 0 ? m.spend / m.leads : 0;
  m.cost_per_conversation = m.whatsapp_conversations > 0 ? m.spend / m.whatsapp_conversations : 0;
  return m;
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function scoreHealth(curr: CampaignMetrics, prev: CampaignMetrics): 'green' | 'yellow' | 'red' {
  // no activity at all
  if (curr.spend === 0 && curr.whatsapp_conversations === 0) return 'red';
  // spending without generating conversations
  if (curr.spend > 0 && curr.whatsapp_conversations === 0) return 'red';
  // cost per conversation spiked 50%+
  if (prev.cost_per_conversation > 0 && curr.cost_per_conversation > prev.cost_per_conversation * 1.5) return 'red';
  // cost per conversation up 25% or conversations down 30%
  if (prev.cost_per_conversation > 0 && curr.cost_per_conversation > prev.cost_per_conversation * 1.25) return 'yellow';
  if (prev.whatsapp_conversations > 0 && curr.whatsapp_conversations < prev.whatsapp_conversations * 0.7) return 'yellow';
  return 'green';
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function dateRange(period: Period) {
  const today = new Date();
  let currFrom: Date, currTo: Date, prevFrom: Date, prevTo: Date;

  const fixedDays = FIXED_DAYS[period];
  if (fixedDays) {
    currTo = new Date(today);
    currFrom = new Date(today);
    currFrom.setDate(currFrom.getDate() - (fixedDays - 1));
    prevTo = new Date(currFrom);
    prevTo.setDate(prevTo.getDate() - 1);
    prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - (fixedDays - 1));
  } else if (period === 'mtd') {
    currFrom = new Date(today.getFullYear(), today.getMonth(), 1);
    currTo = new Date(today);
    // previous = same day-range last month
    prevFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    prevTo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
  } else if (period === 'last_month') {
    currFrom = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    currTo = new Date(today.getFullYear(), today.getMonth(), 0); // last day of prev month
    prevFrom = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    prevTo = new Date(today.getFullYear(), today.getMonth() - 1, 0);
  } else if (period === 'ytd') {
    currFrom = new Date(today.getFullYear(), 0, 1);
    currTo = new Date(today);
    prevFrom = new Date(today.getFullYear() - 1, 0, 1);
    prevTo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate());
  } else {
    currTo = new Date(today);
    currFrom = new Date(today);
    prevTo = new Date(today);
    prevFrom = new Date(today);
  }

  return {
    currFrom: isoDate(currFrom), currTo: isoDate(currTo),
    prevFrom: isoDate(prevFrom), prevTo: isoDate(prevTo),
  };
}

export function useMetaMonitoring(period: Period = '7d', autoRefreshMs = 5 * 60 * 1000) {
  const [rows, setRows] = useState<ClientMonitoringRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const { currFrom, currTo, prevFrom, prevTo } = useMemo(() => dateRange(period), [period]);

  const load = useCallback(async () => {
    setError(null);
    try {
      // 1) linked accounts with client info
      const { data: links, error: linksErr } = await supabase
        .from('client_meta_ad_accounts')
        .select('ad_account_id, client_id, accounts(name, niche, niches(name))')
        .eq('active', true);
      if (linksErr) throw linksErr;

      // 2) ad account names (fallback)
      const { data: bmAccounts } = await supabase
        .from('meta_bm_ad_accounts')
        .select('ad_account_id, name');
      const bmNameMap = new Map<string, string>(bmAccounts?.map(a => [a.ad_account_id, a.name]) || []);

      // 3) metrics current + previous
      const [{ data: currData }, { data: prevData }] = await Promise.all([
        supabase
          .from('ad_account_metrics_daily')
          .select('ad_account_id, date, metrics_json')
          .gte('date', currFrom).lte('date', currTo)
          .eq('platform', 'meta'),
        supabase
          .from('ad_account_metrics_daily')
          .select('ad_account_id, date, metrics_json')
          .gte('date', prevFrom).lte('date', prevTo)
          .eq('platform', 'meta'),
      ]);

      // 4) latest snapshot per account (for last_sync_at)
      const { data: snapshots } = await supabase
        .from('meta_ad_account_snapshots')
        .select('ad_account_id, fetched_at')
        .order('fetched_at', { ascending: false })
        .limit(500);
      const lastSyncMap = new Map<string, string>();
      for (const s of snapshots || []) {
        if (!lastSyncMap.has(s.ad_account_id)) lastSyncMap.set(s.ad_account_id, s.fetched_at);
      }

      // Group metrics by account
      const currByAcc = new Map<string, any[]>();
      for (const r of currData || []) {
        const arr = currByAcc.get(r.ad_account_id) || [];
        arr.push(r); currByAcc.set(r.ad_account_id, arr);
      }
      const prevByAcc = new Map<string, any[]>();
      for (const r of prevData || []) {
        const arr = prevByAcc.get(r.ad_account_id) || [];
        arr.push(r); prevByAcc.set(r.ad_account_id, arr);
      }

      const result: ClientMonitoringRow[] = (links || []).map((l: any) => {
        const current = sumMetrics(currByAcc.get(l.ad_account_id) || []);
        const previous = sumMetrics(prevByAcc.get(l.ad_account_id) || []);
        const niche = l.accounts?.niches?.name || l.accounts?.niche || null;
        return {
          client_id: l.client_id,
          client_name: l.accounts?.name || 'Cliente sem nome',
          ad_account_id: l.ad_account_id,
          ad_account_name: bmNameMap.get(l.ad_account_id) || null,
          niche,
          current,
          previous,
          delta: {
            spend: pctDelta(current.spend, previous.spend),
            leads: pctDelta(current.leads, previous.leads),
            cpl: pctDelta(current.cpl, previous.cpl),
            conversations: pctDelta(current.whatsapp_conversations, previous.whatsapp_conversations),
            cost_per_conversation: pctDelta(current.cost_per_conversation, previous.cost_per_conversation),
          },
          health: scoreHealth(current, previous),
          last_sync_at: lastSyncMap.get(l.ad_account_id) || null,
        };
      });

      setRows(result);
      setLastRefresh(new Date());
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [currFrom, currTo, prevFrom, prevTo]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefreshMs) return;
    const id = setInterval(load, autoRefreshMs);
    return () => clearInterval(id);
  }, [load, autoRefreshMs]);

  return { rows, loading, error, lastRefresh, refresh: load };
}

export function useMetaMonitoringCampaigns(adAccountId: string | null, period: Period = '7d') {
  const [rows, setRows] = useState<CampaignMonitoringRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currFrom, currTo, prevFrom, prevTo } = useMemo(() => dateRange(period), [period]);

  const load = useCallback(async () => {
    if (!adAccountId) { setRows([]); return; }
    setLoading(true); setError(null);
    try {
      const { data: campaigns } = await supabase
        .from('meta_campaigns')
        .select('campaign_id, name, effective_status, daily_budget')
        .eq('ad_account_id', adAccountId);

      const [{ data: curr }, { data: prev }] = await Promise.all([
        supabase.from('meta_campaign_metrics_daily')
          .select('campaign_id, metrics_json')
          .eq('ad_account_id', adAccountId)
          .gte('date', currFrom).lte('date', currTo),
        supabase.from('meta_campaign_metrics_daily')
          .select('campaign_id, metrics_json')
          .eq('ad_account_id', adAccountId)
          .gte('date', prevFrom).lte('date', prevTo),
      ]);

      const currBy = new Map<string, any[]>();
      for (const r of curr || []) {
        const a = currBy.get(r.campaign_id) || []; a.push(r); currBy.set(r.campaign_id, a);
      }
      const prevBy = new Map<string, any[]>();
      for (const r of prev || []) {
        const a = prevBy.get(r.campaign_id) || []; a.push(r); prevBy.set(r.campaign_id, a);
      }

      const result: CampaignMonitoringRow[] = (campaigns || []).map((c: any) => {
        const current = sumMetrics(currBy.get(c.campaign_id) || []);
        const previous = sumMetrics(prevBy.get(c.campaign_id) || []);
        return {
          campaign_id: c.campaign_id,
          campaign_name: c.name,
          ad_account_id: adAccountId,
          effective_status: c.effective_status,
          daily_budget: c.daily_budget,
          current, previous,
          delta: {
            spend: pctDelta(current.spend, previous.spend),
            leads: pctDelta(current.leads, previous.leads),
            cpl: pctDelta(current.cpl, previous.cpl),
            conversations: pctDelta(current.whatsapp_conversations, previous.whatsapp_conversations),
            cost_per_conversation: pctDelta(current.cost_per_conversation, previous.cost_per_conversation),
          },
          health: scoreHealth(current, previous),
        };
      });

      // sort: ACTIVE first, then by spend desc
      result.sort((a, b) => {
        const aActive = a.effective_status === 'ACTIVE' ? 0 : 1;
        const bActive = b.effective_status === 'ACTIVE' ? 0 : 1;
        if (aActive !== bActive) return aActive - bActive;
        return b.current.spend - a.current.spend;
      });

      setRows(result);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [adAccountId, currFrom, currTo, prevFrom, prevTo]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, refresh: load };
}
