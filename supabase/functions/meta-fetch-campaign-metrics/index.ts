import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status?: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
  created_time?: string;
  updated_time?: string;
}

interface MetaInsights {
  campaign_id?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

function findActionValue(actions: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!actions) return 0;
  for (const type of types) {
    const a = actions.find(x => x.action_type === type);
    if (a) return parseFloat(a.value) || 0;
  }
  return 0;
}

function findCostPerAction(costs: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!costs) return 0;
  for (const type of types) {
    const c = costs.find(x => x.action_type === type);
    if (c) return parseFloat(c.value) || 0;
  }
  return 0;
}

function buildMetrics(d: MetaInsights) {
  const spend = parseFloat(d.spend || '0');
  const leads = findActionValue(d.actions, ['lead', 'lead.fb', 'onsite_conversion.lead_grouped']);
  const whatsappConversations = findActionValue(d.actions, [
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
  ]);
  const messagingReplies = findActionValue(d.actions, [
    'onsite_conversion.messaging_first_reply',
    'messaging_first_reply',
  ]);
  const totalWhats = whatsappConversations + messagingReplies;
  const costPerLead = findCostPerAction(d.cost_per_action_type, ['lead', 'lead.fb', 'onsite_conversion.lead_grouped']);
  return {
    impressions: parseInt(d.impressions || '0'),
    reach: parseInt(d.reach || '0'),
    spend,
    clicks: parseInt(d.clicks || '0'),
    link_clicks: parseInt(d.clicks || '0'),
    cpm: parseFloat(d.cpm || '0'),
    cpc: parseFloat(d.cpc || '0'),
    ctr: parseFloat(d.ctr || '0'),
    frequency: parseFloat(d.frequency || '0'),
    leads,
    cost_per_lead: costPerLead,
    whatsapp_conversations: totalWhats,
    messaging_replies: messagingReplies,
    cost_per_message: totalWhats > 0 ? parseFloat((spend / totalWhats).toFixed(2)) : 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { adAccountIds, dateFrom, dateTo } = await req.json().catch(() => ({}));

    const { data: connection } = await supabase
      .from('meta_bm_connection')
      .select('*')
      .eq('business_id', businessId)
      .single();
    if (!connection) {
      return new Response(JSON.stringify({ error: 'Meta not connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const accessToken = connection.access_token_encrypted;

    let accountsToFetch: string[] = adAccountIds;
    if (!accountsToFetch || accountsToFetch.length === 0) {
      const { data: linked } = await supabase
        .from('client_meta_ad_accounts')
        .select('ad_account_id')
        .eq('active', true);
      accountsToFetch = [...new Set(linked?.map(a => a.ad_account_id) || [])];
    }

    const today = new Date();
    const defaultTo = today.toISOString().split('T')[0];
    const defaultFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
    const since = dateFrom || defaultFrom;
    const until = dateTo || defaultTo;

    let campaignsUpserted = 0;
    let metricsUpserted = 0;
    let accountsError = 0;
    const errors: Array<{ account: string; error: string }> = [];

    for (const adAccountId of accountsToFetch) {
      try {
        // 1) Fetch campaigns (entities)
        const campFields = 'id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time';
        const campUrl = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns?fields=${campFields}&limit=200&access_token=${accessToken}`;
        const campRes = await fetch(campUrl);
        const campData = await campRes.json();
        if (campData.error) {
          accountsError++;
          errors.push({ account: adAccountId, error: campData.error.message });
          continue;
        }
        const campaigns: MetaCampaign[] = campData.data || [];
        for (const c of campaigns) {
          const { error } = await supabase
            .from('meta_campaigns')
            .upsert({
              campaign_id: c.id,
              ad_account_id: adAccountId,
              name: c.name,
              objective: c.objective ?? null,
              status: c.status ?? null,
              effective_status: c.effective_status ?? null,
              daily_budget: c.daily_budget ? parseFloat(c.daily_budget) / 100 : null,
              lifetime_budget: c.lifetime_budget ? parseFloat(c.lifetime_budget) / 100 : null,
              start_time: c.start_time ?? null,
              stop_time: c.stop_time ?? null,
              created_time: c.created_time ?? null,
              updated_time: c.updated_time ?? null,
              raw_json: c,
              last_synced_at: new Date().toISOString(),
            }, { onConflict: 'campaign_id' });
          if (!error) campaignsUpserted++;
        }

        // 2) Fetch insights per campaign per day
        const insFields = 'campaign_id,impressions,clicks,spend,reach,cpm,cpc,ctr,frequency,actions,cost_per_action_type';
        const insUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=campaign&fields=${insFields}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&limit=500&access_token=${accessToken}`;
        const insRes = await fetch(insUrl);
        const insData = await insRes.json();
        if (insData.error) {
          errors.push({ account: adAccountId, error: `insights: ${insData.error.message}` });
          continue;
        }
        const days: MetaInsights[] = insData.data || [];
        for (const d of days) {
          if (!d.campaign_id) continue;
          const { error } = await supabase
            .from('meta_campaign_metrics_daily')
            .upsert({
              campaign_id: d.campaign_id,
              ad_account_id: adAccountId,
              date: d.date_start,
              platform: 'meta',
              metrics_json: buildMetrics(d),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'campaign_id,date,platform' });
          if (!error) metricsUpserted++;
        }
      } catch (err: any) {
        accountsError++;
        errors.push({ account: adAccountId, error: err?.message || 'unknown' });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      accounts: accountsToFetch.length,
      accountsError,
      campaignsUpserted,
      metricsUpserted,
      dateRange: { from: since, to: until },
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta-fetch-campaign-metrics] Fatal:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
