import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertRule {
  id: string;
  name: string;
  metric_slug: string;
  condition: 'gt' | 'lt' | 'gte' | 'lte';
  threshold: number;
  window_days: number;
  severity: 'info' | 'attention' | 'critical';
  message: string;
  action_hint: string | null;
  is_active: boolean;
}

type MetricMap = {
  spend: number; impressions: number; clicks: number; reach: number;
  conversions: number; leads: number; whatsapp_conversations: number;
  messaging_replies: number; frequency_sum: number; frequency_count: number;
};

function emptyMetrics(): MetricMap {
  return { spend: 0, impressions: 0, clicks: 0, reach: 0, conversions: 0, leads: 0,
    whatsapp_conversations: 0, messaging_replies: 0, frequency_sum: 0, frequency_count: 0 };
}

function computeMetricValue(slug: string, m: MetricMap): number | null {
  switch (slug) {
    case 'spend': return m.spend;
    case 'impressions': return m.impressions;
    case 'reach': return m.reach;
    case 'link_clicks': return m.clicks;
    case 'conversions': return m.conversions;
    case 'purchases': return 0;
    case 'purchase_value': return 0;
    case 'whatsapp_clicks': return m.whatsapp_conversations;
    case 'whatsapp_conversations': return m.whatsapp_conversations;
    case 'cpm': return m.impressions > 0 ? (m.spend / m.impressions) * 1000 : null;
    case 'ctr_link': return m.impressions > 0 ? (m.clicks / m.impressions) * 100 : null;
    case 'cpc_link': return m.clicks > 0 ? m.spend / m.clicks : null;
    case 'cpa': return m.conversions > 0 ? m.spend / m.conversions : null;
    case 'cpwa': return m.whatsapp_conversations > 0 ? m.spend / m.whatsapp_conversations : null;
    case 'cost_per_message': return m.whatsapp_conversations > 0 ? m.spend / m.whatsapp_conversations : null;
    case 'frequency': return m.frequency_count > 0 ? m.frequency_sum / m.frequency_count : null;
    default: return null;
  }
}

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

function violates(value: number, condition: AlertRule['condition'], threshold: number): boolean {
  switch (condition) {
    case 'gt': return value > threshold;
    case 'gte': return value >= threshold;
    case 'lt': return value < threshold;
    case 'lte': return value <= threshold;
    default: return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1) Regras ativas
    const { data: rules } = await supabase
      .from('traffic_alert_rules')
      .select('*')
      .eq('is_active', true);
    if (!rules || rules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active rules' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2) Contas vinculadas (ativas)
    const { data: links } = await supabase
      .from('client_meta_ad_accounts')
      .select('ad_account_id, client_id')
      .eq('active', true);
    if (!links || links.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No linked accounts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const uniqAccounts = [...new Set(links.map(l => l.ad_account_id))];
    const clientByAccount = new Map<string, string>();
    for (const l of links) {
      if (!clientByAccount.has(l.ad_account_id)) clientByAccount.set(l.ad_account_id, l.client_id);
    }

    // Janela maior da engine = maior window_days entre regras
    const maxWindow = Math.max(...rules.map((r: AlertRule) => r.window_days));
    const today = new Date();
    const fromDate = new Date(today); fromDate.setDate(fromDate.getDate() - (maxWindow - 1));

    // 3) Métricas agregadas por conta × janela
    const { data: metrics } = await supabase
      .from('ad_account_metrics_daily')
      .select('ad_account_id, date, metrics_json')
      .eq('platform', 'meta')
      .gte('date', isoDate(fromDate))
      .lte('date', isoDate(today))
      .in('ad_account_id', uniqAccounts);

    // 4) Alertas já ativos (últimas 24h não resolvidos): evita duplicatas
    const since = new Date(today); since.setHours(since.getHours() - 24);
    const { data: existing } = await supabase
      .from('alerts_triggered')
      .select('rule_id, ad_account_id, resolved_at')
      .gte('triggered_at', since.toISOString());
    const existingKeys = new Set(
      (existing || [])
        .filter(e => !e.resolved_at)
        .map(e => `${e.rule_id}|${e.ad_account_id}`)
    );

    // 5) Processa cada regra × conta
    const newAlerts: any[] = [];
    for (const rule of rules as AlertRule[]) {
      const windowStart = new Date(today); windowStart.setDate(windowStart.getDate() - (rule.window_days - 1));
      const winFrom = isoDate(windowStart);
      const winTo = isoDate(today);

      for (const accId of uniqAccounts) {
        const dedupeKey = `${rule.id}|${accId}`;
        if (existingKeys.has(dedupeKey)) continue;

        const agg = emptyMetrics();
        for (const m of metrics || []) {
          if (m.ad_account_id !== accId) continue;
          if (m.date < winFrom || m.date > winTo) continue;
          const j = m.metrics_json || {};
          agg.spend += Number(j.spend) || 0;
          agg.impressions += Number(j.impressions) || 0;
          agg.clicks += Number(j.clicks) || 0;
          agg.reach += Number(j.reach) || 0;
          agg.conversions += Number(j.conversions) || 0;
          agg.leads += Number(j.leads) || 0;
          agg.whatsapp_conversations += Number(j.whatsapp_conversations) || 0;
          agg.messaging_replies += Number(j.messaging_replies) || 0;
          const f = Number(j.frequency) || 0;
          if (f > 0) { agg.frequency_sum += f; agg.frequency_count += 1; }
        }

        const value = computeMetricValue(rule.metric_slug, agg);
        if (value === null) continue; // sem dado suficiente

        if (violates(value, rule.condition, rule.threshold)) {
          newAlerts.push({
            rule_id: rule.id,
            ad_account_id: accId,
            client_id: clientByAccount.get(accId) || null,
            severity: rule.severity,
            kind: rule.metric_slug,
            message: `${rule.message} — valor: ${value.toFixed(2)} (${rule.condition} ${rule.threshold})`,
            metric_value: value,
            baseline_value: rule.threshold,
            action_hint: rule.action_hint,
          });
        }
      }
    }

    if (newAlerts.length > 0) {
      const { error: insertErr } = await supabase.from('alerts_triggered').insert(newAlerts);
      if (insertErr) {
        console.error('[traffic-alert-engine] insert:', insertErr);
      }
    }

    // 6) Runway crítico e "sem conversas 24h" — regras especiais hardcoded
    const specialAlerts: any[] = [];

    // Runway ≤7d (snapshot mais recente + gasto médio 7d)
    const { data: snapshots } = await supabase
      .from('meta_ad_account_snapshots')
      .select('ad_account_id, available_balance, fetched_at')
      .order('fetched_at', { ascending: false })
      .limit(2000);
    const latestSnap = new Map<string, any>();
    for (const s of snapshots || []) {
      if (!latestSnap.has(s.ad_account_id)) latestSnap.set(s.ad_account_id, s);
    }

    // Gasto médio 7d por conta
    const spend7d = new Map<string, number>();
    const from7 = new Date(today); from7.setDate(from7.getDate() - 7);
    for (const m of metrics || []) {
      if (new Date(m.date) < from7) continue;
      const j = m.metrics_json || {};
      spend7d.set(m.ad_account_id, (spend7d.get(m.ad_account_id) || 0) + (Number(j.spend) || 0));
    }

    for (const accId of uniqAccounts) {
      const snap = latestSnap.get(accId);
      if (!snap || snap.available_balance == null || snap.available_balance <= 0) continue;
      const avgSpend = (spend7d.get(accId) || 0) / 7;
      if (avgSpend <= 0) continue;
      const runway = snap.available_balance / avgSpend;

      const dedupeKey = `runway_low|${accId}`;
      if (runway <= 7 && !existingKeys.has(dedupeKey)) {
        specialAlerts.push({
          rule_id: null,
          ad_account_id: accId,
          client_id: clientByAccount.get(accId) || null,
          severity: runway <= 3 ? 'critical' : 'attention',
          kind: 'runway_low',
          message: `Saldo para ${runway.toFixed(1)} dias ao ritmo atual (avg R$${avgSpend.toFixed(2)}/dia)`,
          metric_value: runway,
          baseline_value: 7,
          action_hint: 'Solicitar reabastecimento de saldo ao cliente',
        });
        existingKeys.add(dedupeKey);
      }
    }

    // Zero conversas 24h em conta ACTIVE
    const { data: campaigns } = await supabase
      .from('meta_campaigns')
      .select('ad_account_id, effective_status')
      .eq('effective_status', 'ACTIVE');
    const activeAccounts = new Set((campaigns || []).map(c => c.ad_account_id));

    const todayStr = isoDate(today);
    const convsToday = new Map<string, number>();
    const spendToday = new Map<string, number>();
    for (const m of metrics || []) {
      if (m.date !== todayStr) continue;
      const j = m.metrics_json || {};
      convsToday.set(m.ad_account_id, (convsToday.get(m.ad_account_id) || 0) + (Number(j.whatsapp_conversations) || 0));
      spendToday.set(m.ad_account_id, (spendToday.get(m.ad_account_id) || 0) + (Number(j.spend) || 0));
    }

    for (const accId of activeAccounts) {
      const dedupeKey = `no_conversations|${accId}`;
      if (existingKeys.has(dedupeKey)) continue;
      const conv = convsToday.get(accId) || 0;
      const spend = spendToday.get(accId) || 0;
      if (spend > 10 && conv === 0) {
        specialAlerts.push({
          rule_id: null,
          ad_account_id: accId,
          client_id: clientByAccount.get(accId) || null,
          severity: 'attention',
          kind: 'no_conversations',
          message: `Gastou R$${spend.toFixed(2)} hoje sem gerar conversas`,
          metric_value: conv,
          baseline_value: 1,
          action_hint: 'Verificar se botão WhatsApp está ativo; revisar criativo',
        });
        existingKeys.add(dedupeKey);
      }
    }

    if (specialAlerts.length > 0) {
      const { error: insErr } = await supabase.from('alerts_triggered').insert(specialAlerts);
      if (insErr) console.error('[traffic-alert-engine] special insert:', insErr);
    }

    // 7) Auto-resolver alertas antigos que não violam mais
    // (estratégia simples: marca como resolved qualquer alerta >48h sem ser reacionado)
    await supabase
      .from('alerts_triggered')
      .update({ resolved_at: new Date().toISOString() })
      .is('resolved_at', null)
      .lt('triggered_at', new Date(today.getTime() - 48 * 3600 * 1000).toISOString());

    return new Response(JSON.stringify({
      success: true,
      rules_evaluated: rules.length,
      accounts_evaluated: uniqAccounts.length,
      new_alerts: newAlerts.length,
      special_alerts: specialAlerts.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[traffic-alert-engine] Fatal:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
