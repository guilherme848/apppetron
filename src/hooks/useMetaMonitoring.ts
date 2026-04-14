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
  reach: number;
  clicks: number;
  ctr: number;
  unique_ctr: number; // clicks / reach × 100 (aprox. CTR único)
  cpl: number;
  cpm: number;
  whatsapp_conversations: number;
  messaging_replies: number;
  cost_per_conversation: number;
  conversion_rate: number; // conversas / cliques
  frequency: number;
  profile_visits: number;
  new_followers: number;
}

export interface FunnelDecomposition {
  curr_cpm: number;
  curr_ctr: number;
  curr_conv_rate: number;
  baseline_cpm: number;
  baseline_ctr: number;
  baseline_conv_rate: number;
  delta_cpm: number;
  delta_ctr: number;
  delta_conv_rate: number;
}

export interface PacingInfo {
  monthly_budget: number | null;
  month_spend: number;
  days_elapsed: number;
  days_in_month: number;
  projection: number; // linear projection to end of month
  status: 'on_track' | 'over' | 'under' | 'no_budget';
}

export interface DailyPoint {
  date: string;
  spend: number;
  conversations: number;
}

export interface BalanceInfo {
  amount_spent: number | null;
  spend_cap: number | null;
  available_balance: number | null;
  runway_days: number | null; // days until balance runs out at 7d avg spend
  daily_spend_avg: number;
}

export interface ClientMonitoringRow {
  client_id: string;
  client_name: string;
  ad_account_id: string;
  ad_account_name: string | null;
  niche: string | null;
  current: CampaignMetrics;
  previous: CampaignMetrics;
  baseline: CampaignMetrics; // 14-day trailing average (normalized to period length)
  delta: { spend: number; leads: number; cpl: number; conversations: number; cost_per_conversation: number };
  deltaBaseline: { spend: number; conversations: number; cost_per_conversation: number };
  sparkline: DailyPoint[]; // last 14 days
  balance: BalanceInfo;
  health: 'green' | 'yellow' | 'red';
  last_sync_at: string | null;
  funnel: FunnelDecomposition | null;
  pacing: PacingInfo | null;
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
  return { spend: 0, leads: 0, impressions: 0, reach: 0, clicks: 0, ctr: 0, unique_ctr: 0, cpl: 0, cpm: 0, whatsapp_conversations: 0, messaging_replies: 0, cost_per_conversation: 0, conversion_rate: 0, frequency: 0, profile_visits: 0, new_followers: 0 };
}

function sumMetrics(rows: Array<{ metrics_json: any }>): CampaignMetrics {
  const m = emptyMetrics();
  let freqSum = 0;
  let freqCount = 0;
  for (const r of rows) {
    const j = r.metrics_json || {};
    m.spend += Number(j.spend) || 0;
    m.leads += Number(j.leads) || 0;
    m.impressions += Number(j.impressions) || 0;
    m.reach += Number(j.reach) || 0;
    m.clicks += Number(j.clicks) || 0;
    m.whatsapp_conversations += Number(j.whatsapp_conversations) || 0;
    m.messaging_replies += Number(j.messaging_replies) || 0;
    m.profile_visits += Number(j.profile_visits) || 0;
    m.new_followers += Number(j.new_followers) || 0;
    const f = Number(j.frequency) || 0;
    if (f > 0) { freqSum += f; freqCount += 1; }
  }
  m.ctr = m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0;
  m.unique_ctr = m.reach > 0 ? (m.clicks / m.reach) * 100 : 0;
  m.cpl = m.leads > 0 ? m.spend / m.leads : 0;
  m.cpm = m.impressions > 0 ? (m.spend / m.impressions) * 1000 : 0;
  m.cost_per_conversation = m.whatsapp_conversations > 0 ? m.spend / m.whatsapp_conversations : 0;
  m.conversion_rate = m.clicks > 0 ? (m.whatsapp_conversations / m.clicks) * 100 : 0;
  m.frequency = freqCount > 0 ? freqSum / freqCount : 0;
  return m;
}

function pctDelta(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function scoreHealth(
  curr: CampaignMetrics,
  baseline: CampaignMetrics,
  balance: BalanceInfo,
): 'green' | 'yellow' | 'red' {
  // Runway crítico (7 dias ou menos) sempre marca vermelho
  if (balance.runway_days !== null && balance.runway_days <= 7) return 'red';
  // No activity at all
  if (curr.spend === 0 && curr.whatsapp_conversations === 0) return 'red';
  // Spending sem gerar conversas
  if (curr.spend > 0 && curr.whatsapp_conversations === 0) return 'red';
  // Custo/conversa subiu 50%+ vs baseline 14d
  if (baseline.cost_per_conversation > 0 && curr.cost_per_conversation > baseline.cost_per_conversation * 1.5) return 'red';
  // Runway baixo (7-14 dias)
  if (balance.runway_days !== null && balance.runway_days <= 14) return 'yellow';
  // Custo/conversa +25% ou conversas -30% vs baseline
  if (baseline.cost_per_conversation > 0 && curr.cost_per_conversation > baseline.cost_per_conversation * 1.25) return 'yellow';
  if (baseline.whatsapp_conversations > 0 && curr.whatsapp_conversations < baseline.whatsapp_conversations * 0.7) return 'yellow';
  return 'green';
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(ms / 86400000) + 1);
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
      // Baseline/sparkline always look 14 days back
      const today = new Date();
      const trailing14From = isoDate(new Date(today.getTime() - 14 * 86400000));
      const trailing14To = isoDate(today);

      // Range wide enough to cover all needs in a single query
      const monthStartDate = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));
      const minFrom = [currFrom, prevFrom, trailing14From, monthStartDate].sort()[0];
      const maxTo = [currTo, prevTo, trailing14To].sort().slice(-1)[0];

      // Estende o range pra cobrir o 1º do mês (MTD) pra pacing
      const monthStart = isoDate(new Date(today.getFullYear(), today.getMonth(), 1));

      const [linksRes, bmRes, metricsRes, snapshotsRes] = await Promise.all([
        supabase
          .from('client_meta_ad_accounts')
          .select('ad_account_id, client_id, accounts(name, niche, ad_monthly_budget, niches(name))')
          .eq('active', true),
        supabase.from('meta_bm_ad_accounts').select('ad_account_id, name'),
        supabase
          .from('ad_account_metrics_daily')
          .select('ad_account_id, date, metrics_json')
          .gte('date', minFrom).lte('date', maxTo)
          .eq('platform', 'meta')
          .limit(100000),
        supabase
          .from('meta_ad_account_snapshots')
          .select('ad_account_id, fetched_at, amount_spent, spend_cap, available_balance')
          .order('fetched_at', { ascending: false })
          .limit(2000),
      ]);

      if (linksRes.error) throw linksRes.error;
      const links = linksRes.data || [];
      const bmAccounts = bmRes.data || [];
      const metrics = metricsRes.data || [];
      const snapshots = snapshotsRes.data || [];

      const bmNameMap = new Map<string, string>(bmAccounts.map(a => [a.ad_account_id, a.name]));

      // Index metrics: ad_account_id -> date -> row
      const metricsByAcc = new Map<string, Map<string, any>>();
      for (const r of metrics) {
        if (!metricsByAcc.has(r.ad_account_id)) metricsByAcc.set(r.ad_account_id, new Map());
        metricsByAcc.get(r.ad_account_id)!.set(r.date, r);
      }

      // Latest snapshot per account
      const snapByAcc = new Map<string, any>();
      for (const s of snapshots) {
        if (!snapByAcc.has(s.ad_account_id)) snapByAcc.set(s.ad_account_id, s);
      }

      const currDays = daysBetween(currFrom, currTo);
      const baselineDays = 14;

      const result: ClientMonitoringRow[] = links.map((l: any) => {
        const accMetrics = metricsByAcc.get(l.ad_account_id) || new Map();
        const rowsInRange = (from: string, to: string) => {
          const out: any[] = [];
          for (const [date, r] of accMetrics.entries()) {
            if (date >= from && date <= to) out.push(r);
          }
          return out;
        };
        const current = sumMetrics(rowsInRange(currFrom, currTo));
        const previous = sumMetrics(rowsInRange(prevFrom, prevTo));

        // Baseline: 14 dias terminando 1 dia antes do início do período atual
        const baselineEnd = isoDate(new Date(new Date(currFrom).getTime() - 86400000));
        const baselineStart = isoDate(new Date(new Date(baselineEnd).getTime() - (baselineDays - 1) * 86400000));
        const baselineRaw = sumMetrics(rowsInRange(baselineStart, baselineEnd));
        // Normaliza pra janela do período atual (mesmo tamanho)
        const scale = currDays / baselineDays;
        const baseline: CampaignMetrics = {
          spend: baselineRaw.spend * scale,
          leads: baselineRaw.leads * scale,
          impressions: baselineRaw.impressions * scale,
          reach: baselineRaw.reach * scale,
          clicks: baselineRaw.clicks * scale,
          whatsapp_conversations: baselineRaw.whatsapp_conversations * scale,
          messaging_replies: baselineRaw.messaging_replies * scale,
          ctr: baselineRaw.ctr,
          unique_ctr: baselineRaw.unique_ctr,
          cpl: baselineRaw.cpl,
          cpm: baselineRaw.cpm,
          cost_per_conversation: baselineRaw.cost_per_conversation,
          conversion_rate: baselineRaw.conversion_rate,
          frequency: baselineRaw.frequency,
          profile_visits: baselineRaw.profile_visits * scale,
          new_followers: baselineRaw.new_followers * scale,
        };

        // Sparkline: últimos 14 dias
        const sparkline: DailyPoint[] = [];
        for (let i = 13; i >= 0; i--) {
          const d = isoDate(new Date(today.getTime() - i * 86400000));
          const r = accMetrics.get(d);
          const j = r?.metrics_json || {};
          sparkline.push({
            date: d,
            spend: Number(j.spend) || 0,
            conversations: Number(j.whatsapp_conversations) || 0,
          });
        }

        // Balance + runway
        const snap = snapByAcc.get(l.ad_account_id);
        const last7SpendAvg = sparkline.slice(-7).reduce((a, p) => a + p.spend, 0) / 7;
        const available = snap?.available_balance;
        const balance: BalanceInfo = {
          amount_spent: snap?.amount_spent ?? null,
          spend_cap: snap?.spend_cap ?? null,
          available_balance: available ?? null,
          daily_spend_avg: last7SpendAvg,
          runway_days: available != null && last7SpendAvg > 0 ? available / last7SpendAvg : null,
        };

        // Pacing: MTD spend + projection
        const monthSpend = rowsInRange(monthStartDate, isoDate(today))
          .reduce((a, r) => a + (Number(r.metrics_json?.spend) || 0), 0);
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const daysElapsed = today.getDate();
        const projection = daysElapsed > 0 ? (monthSpend / daysElapsed) * daysInMonth : 0;
        const monthlyBudget = l.accounts?.ad_monthly_budget != null ? Number(l.accounts.ad_monthly_budget) : null;
        let pacingStatus: PacingInfo['status'] = 'no_budget';
        if (monthlyBudget != null && monthlyBudget > 0) {
          const pct = projection / monthlyBudget;
          if (pct > 1.1) pacingStatus = 'over';
          else if (pct < 0.8) pacingStatus = 'under';
          else pacingStatus = 'on_track';
        }
        const pacing: PacingInfo = {
          monthly_budget: monthlyBudget,
          month_spend: monthSpend,
          days_elapsed: daysElapsed,
          days_in_month: daysInMonth,
          projection,
          status: pacingStatus,
        };

        // Funnel decomposition: CPM / CTR / taxa de conversa (current vs baseline)
        const funnel: FunnelDecomposition | null = (current.impressions > 0 && baseline.impressions > 0) ? {
          curr_cpm: current.cpm,
          curr_ctr: current.ctr,
          curr_conv_rate: current.conversion_rate,
          baseline_cpm: baseline.cpm,
          baseline_ctr: baseline.ctr,
          baseline_conv_rate: baseline.conversion_rate,
          delta_cpm: pctDelta(current.cpm, baseline.cpm),
          delta_ctr: pctDelta(current.ctr, baseline.ctr),
          delta_conv_rate: pctDelta(current.conversion_rate, baseline.conversion_rate),
        } : null;

        const niche = l.accounts?.niches?.name || l.accounts?.niche || null;
        return {
          client_id: l.client_id,
          client_name: l.accounts?.name || 'Cliente sem nome',
          ad_account_id: l.ad_account_id,
          ad_account_name: bmNameMap.get(l.ad_account_id) || null,
          niche,
          current, previous, baseline,
          funnel, pacing,
          delta: {
            spend: pctDelta(current.spend, previous.spend),
            leads: pctDelta(current.leads, previous.leads),
            cpl: pctDelta(current.cpl, previous.cpl),
            conversations: pctDelta(current.whatsapp_conversations, previous.whatsapp_conversations),
            cost_per_conversation: pctDelta(current.cost_per_conversation, previous.cost_per_conversation),
          },
          deltaBaseline: {
            spend: pctDelta(current.spend, baseline.spend),
            conversations: pctDelta(current.whatsapp_conversations, baseline.whatsapp_conversations),
            cost_per_conversation: pctDelta(current.cost_per_conversation, baseline.cost_per_conversation),
          },
          sparkline,
          balance,
          health: scoreHealth(current, baseline, balance),
          last_sync_at: snap?.fetched_at ?? null,
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

/**
 * Prefetch de todas as campanhas em UMA chamada RPC. Feito na página principal
 * pra drawer ficar instantâneo. Payload ~10KB pra 25 contas × 10 campanhas.
 */
export function useCampaignMonitoringPrefetch(period: Period = '7d') {
  const [byAccount, setByAccount] = useState<Map<string, CampaignMonitoringRow[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const { currFrom, currTo, prevFrom, prevTo } = useMemo(() => dateRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: links } = await supabase
        .from('client_meta_ad_accounts')
        .select('ad_account_id')
        .eq('active', true);
      const ids = [...new Set((links || []).map(l => l.ad_account_id))];
      if (ids.length === 0) { setByAccount(new Map()); return; }

      const { data, error } = await supabase.rpc('get_campaign_monitoring', {
        p_ad_account_ids: ids,
        p_curr_from: currFrom,
        p_curr_to: currTo,
        p_prev_from: prevFrom,
        p_prev_to: prevTo,
      });
      if (error) {
        console.error('[useCampaignMonitoringPrefetch] rpc:', error);
        return;
      }

      const map = new Map<string, CampaignMonitoringRow[]>();
      for (const r of data || []) {
        const currConvs = Number(r.curr_conversations) || 0;
        const currSpend = Number(r.curr_spend) || 0;
        const prevConvs = Number(r.prev_conversations) || 0;
        const prevSpend = Number(r.prev_spend) || 0;
        const currLeads = Number(r.curr_leads) || 0;
        const prevLeads = Number(r.prev_leads) || 0;
        const currImpr = Number(r.curr_impressions) || 0;
        const currClicks = Number(r.curr_clicks) || 0;
        const prevImpr = Number(r.prev_impressions) || 0;
        const prevClicks = Number(r.prev_clicks) || 0;

        const current: CampaignMetrics = {
          spend: currSpend,
          leads: currLeads,
          impressions: currImpr,
          clicks: currClicks,
          reach: 0,
          ctr: currImpr > 0 ? (currClicks / currImpr) * 100 : 0,
          unique_ctr: 0,
          cpl: currLeads > 0 ? currSpend / currLeads : 0,
          cpm: currImpr > 0 ? (currSpend / currImpr) * 1000 : 0,
          whatsapp_conversations: currConvs,
          messaging_replies: Number(r.curr_messaging_replies) || 0,
          cost_per_conversation: currConvs > 0 ? currSpend / currConvs : 0,
          conversion_rate: currClicks > 0 ? (currConvs / currClicks) * 100 : 0,
          frequency: Number(r.curr_frequency_avg) || 0,
          profile_visits: 0,
          new_followers: 0,
        };
        const previous: CampaignMetrics = {
          spend: prevSpend,
          leads: prevLeads,
          impressions: prevImpr,
          clicks: prevClicks,
          reach: 0,
          ctr: prevImpr > 0 ? (prevClicks / prevImpr) * 100 : 0,
          unique_ctr: 0,
          cpl: prevLeads > 0 ? prevSpend / prevLeads : 0,
          cpm: prevImpr > 0 ? (prevSpend / prevImpr) * 1000 : 0,
          whatsapp_conversations: prevConvs,
          messaging_replies: 0,
          cost_per_conversation: prevConvs > 0 ? prevSpend / prevConvs : 0,
          conversion_rate: prevClicks > 0 ? (prevConvs / prevClicks) * 100 : 0,
          frequency: 0,
        };
        const row: CampaignMonitoringRow = {
          campaign_id: r.campaign_id,
          campaign_name: r.name,
          ad_account_id: r.ad_account_id,
          effective_status: r.effective_status,
          daily_budget: r.daily_budget,
          current, previous,
          delta: {
            spend: pctDelta(current.spend, previous.spend),
            leads: pctDelta(current.leads, previous.leads),
            cpl: pctDelta(current.cpl, previous.cpl),
            conversations: pctDelta(current.whatsapp_conversations, previous.whatsapp_conversations),
            cost_per_conversation: pctDelta(current.cost_per_conversation, previous.cost_per_conversation),
          },
          health: scoreHealth(current, previous, { amount_spent: null, spend_cap: null, available_balance: null, runway_days: null, daily_spend_avg: 0 }),
        };
        const arr = map.get(r.ad_account_id) || [];
        arr.push(row);
        map.set(r.ad_account_id, arr);
      }

      // Ordena: ACTIVE primeiro, depois por spend desc
      for (const arr of map.values()) {
        arr.sort((a, b) => {
          const aa = a.effective_status === 'ACTIVE' ? 0 : 1;
          const bb = b.effective_status === 'ACTIVE' ? 0 : 1;
          if (aa !== bb) return aa - bb;
          return b.current.spend - a.current.spend;
        });
      }

      setByAccount(map);
    } finally {
      setLoading(false);
    }
  }, [currFrom, currTo, prevFrom, prevTo]);

  useEffect(() => { load(); }, [load]);
  return { byAccount, loading, refresh: load };
}

export function useMetaMonitoringCampaigns(adAccountId: string | null, period: Period = '7d') {
  const [rows, setRows] = useState<CampaignMonitoringRow[]>([]);
  // Comeca em true quando temos adAccountId — evita flash de "vazio" antes do fetch
  const [loading, setLoading] = useState(!!adAccountId);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currFrom, currTo, prevFrom, prevTo } = useMemo(() => dateRange(period), [period]);

  const load = useCallback(async () => {
    if (!adAccountId) { setRows([]); setHasLoaded(false); return; }
    setLoading(true); setError(null);
    try {
      // 1) Uma query só pra metrics, cobrindo período atual + anterior
      const minDate = currFrom <= prevFrom ? currFrom : prevFrom;
      const maxDate = currTo >= prevTo ? currTo : prevTo;

      const metricsRes = await supabase
        .from('meta_campaign_metrics_daily')
        .select('campaign_id, date, metrics_json')
        .eq('ad_account_id', adAccountId)
        .gte('date', minDate).lte('date', maxDate)
        .limit(10000);
      if (metricsRes.error) {
        console.error('[useMetaMonitoringCampaigns] metrics:', metricsRes.error);
        throw metricsRes.error;
      }
      const allMetrics = metricsRes.data || [];

      // Separa em curr/prev em JS
      const curr = allMetrics.filter(m => m.date >= currFrom && m.date <= currTo);
      const prev = allMetrics.filter(m => m.date >= prevFrom && m.date <= prevTo);

      // 2) Só campanhas relevantes: com atividade no período OU ACTIVE (podem ter acabado de começar)
      const activeIds = Array.from(new Set(allMetrics.map(m => m.campaign_id)));
      const [withActivityRes, activeStatusRes] = await Promise.all([
        activeIds.length > 0
          ? supabase
              .from('meta_campaigns')
              .select('campaign_id, name, effective_status, daily_budget')
              .in('campaign_id', activeIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from('meta_campaigns')
          .select('campaign_id, name, effective_status, daily_budget')
          .eq('ad_account_id', adAccountId)
          .eq('effective_status', 'ACTIVE')
          .limit(200),
      ]);

      if (withActivityRes.error) console.error('[useMetaMonitoringCampaigns] campaigns w/activity:', withActivityRes.error);
      if (activeStatusRes.error) console.error('[useMetaMonitoringCampaigns] campaigns active:', activeStatusRes.error);

      const campMap = new Map<string, any>();
      for (const c of withActivityRes.data || []) campMap.set(c.campaign_id, c);
      for (const c of activeStatusRes.data || []) if (!campMap.has(c.campaign_id)) campMap.set(c.campaign_id, c);
      const campaigns = Array.from(campMap.values());

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
      setHasLoaded(true);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar campanhas');
    } finally {
      setLoading(false);
    }
  }, [adAccountId, currFrom, currTo, prevFrom, prevTo]);

  useEffect(() => { load(); }, [load]);

  return { rows, loading, error, hasLoaded, refresh: load };
}

export interface AdMonitoringRow {
  ad_id: string;
  campaign_id: string;
  ad_account_id: string;
  name: string;
  effective_status: string | null;
  creative_id: string | null;
  thumbnail_url: string | null;
  image_url: string | null;
  creative_title: string | null;
  creative_body: string | null;
  current: {
    spend: number;
    conversations: number;
    impressions: number;
    clicks: number;
    reach: number;
    ctr: number;
    unique_ctr: number;
    cpm: number;
    cost_per_conversation: number;
    conversion_rate: number;
    frequency: number;
  };
  delta: {
    conversations: number;
    cost_per_conversation: number;
    spend: number;
  };
  health: 'green' | 'yellow' | 'red';
  fatigue_level: 'ok' | 'warning' | 'saturated';
}

export function useAdsForCampaign(campaignId: string | null, period: Period = '7d') {
  const [rows, setRows] = useState<AdMonitoringRow[]>([]);
  const [loading, setLoading] = useState(!!campaignId);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { currFrom, currTo, prevFrom, prevTo } = useMemo(() => dateRange(period), [period]);

  const load = useCallback(async () => {
    if (!campaignId) { setRows([]); setHasLoaded(false); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_ad_monitoring', {
        p_campaign_id: campaignId,
        p_curr_from: currFrom, p_curr_to: currTo,
        p_prev_from: prevFrom, p_prev_to: prevTo,
      });
      if (error) {
        console.error('[useAdsForCampaign] rpc:', error);
        setHasLoaded(true);
        return;
      }
      const mapped: AdMonitoringRow[] = ((data as any[]) || []).map((r: any) => {
        const currSpend = Number(r.curr_spend) || 0;
        const currConvs = Number(r.curr_conversations) || 0;
        const currImpr = Number(r.curr_impressions) || 0;
        const currClicks = Number(r.curr_clicks) || 0;
        const currReach = Number(r.curr_reach) || 0;
        const freq = Number(r.curr_frequency_avg) || 0;
        const prevSpend = Number(r.prev_spend) || 0;
        const prevConvs = Number(r.prev_conversations) || 0;
        const cpc = currConvs > 0 ? currSpend / currConvs : 0;
        const prevCpc = prevConvs > 0 ? prevSpend / prevConvs : 0;

        let fatigue_level: AdMonitoringRow['fatigue_level'] = 'ok';
        if (freq >= 5) fatigue_level = 'saturated';
        else if (freq >= 3.5) fatigue_level = 'warning';

        let health: AdMonitoringRow['health'] = 'green';
        if (currSpend > 0 && currConvs === 0) health = 'red';
        else if (fatigue_level === 'saturated') health = 'red';
        else if (fatigue_level === 'warning') health = 'yellow';
        else if (prevCpc > 0 && cpc > prevCpc * 1.5) health = 'red';
        else if (prevCpc > 0 && cpc > prevCpc * 1.25) health = 'yellow';

        return {
          ad_id: r.ad_id,
          campaign_id: r.campaign_id,
          ad_account_id: r.ad_account_id,
          name: r.name,
          effective_status: r.effective_status,
          creative_id: r.creative_id,
          thumbnail_url: r.thumbnail_url,
          image_url: r.image_url,
          creative_title: r.creative_title,
          creative_body: r.creative_body,
          current: {
            spend: currSpend,
            conversations: currConvs,
            impressions: currImpr,
            clicks: currClicks,
            reach: currReach,
            ctr: currImpr > 0 ? (currClicks / currImpr) * 100 : 0,
            unique_ctr: currReach > 0 ? (currClicks / currReach) * 100 : 0,
            cpm: currImpr > 0 ? (currSpend / currImpr) * 1000 : 0,
            cost_per_conversation: cpc,
            conversion_rate: currClicks > 0 ? (currConvs / currClicks) * 100 : 0,
            frequency: freq,
          },
          delta: {
            conversations: pctDelta(currConvs, prevConvs),
            cost_per_conversation: pctDelta(cpc, prevCpc),
            spend: pctDelta(currSpend, prevSpend),
          },
          health,
          fatigue_level,
        };
      });
      mapped.sort((a, b) => {
        const aa = a.effective_status === 'ACTIVE' ? 0 : 1;
        const bb = b.effective_status === 'ACTIVE' ? 0 : 1;
        if (aa !== bb) return aa - bb;
        return b.current.spend - a.current.spend;
      });
      setRows(mapped);
      setHasLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [campaignId, currFrom, currTo, prevFrom, prevTo]);

  useEffect(() => { load(); }, [load]);
  return { rows, loading, hasLoaded };
}
