import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaAd {
  id: string;
  name: string;
  status?: string;
  effective_status?: string;
  campaign_id?: string;
  adset_id?: string;
  creative?: { id: string };
  created_time?: string;
  updated_time?: string;
}

interface MetaInsights {
  ad_id?: string;
  campaign_id?: string;
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpm?: string;
  ctr?: string;
  frequency?: string;
  actions?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start: string;
}

function findActionValue(actions: any, types: string[]): number {
  if (!actions) return 0;
  for (const t of types) {
    const a = actions.find((x: any) => x.action_type === t);
    if (a) return parseFloat(a.value) || 0;
  }
  return 0;
}

function buildMetrics(d: MetaInsights) {
  const spend = parseFloat(d.spend || '0');
  const whatsappConversations = findActionValue(d.actions, [
    'onsite_conversion.messaging_conversation_started_7d',
    'messaging_conversation_started_7d',
  ]);
  const messagingReplies = findActionValue(d.actions, [
    'onsite_conversion.messaging_first_reply',
    'messaging_first_reply',
  ]);
  return {
    impressions: parseInt(d.impressions || '0'),
    clicks: parseInt(d.clicks || '0'),
    reach: parseInt(d.reach || '0'),
    spend,
    cpm: parseFloat(d.cpm || '0'),
    ctr: parseFloat(d.ctr || '0'),
    frequency: parseFloat(d.frequency || '0'),
    whatsapp_conversations: whatsappConversations + messagingReplies,
    messaging_replies: messagingReplies,
    cost_per_conversation: (whatsappConversations + messagingReplies) > 0
      ? parseFloat((spend / (whatsappConversations + messagingReplies)).toFixed(2)) : 0,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: 'config' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { adAccountIds, dateFrom, dateTo, batchSize = 3, batchOffset = 0, fetchCreatives = true } = await req.json().catch(() => ({}));

    const { data: connection } = await supabase
      .from('meta_bm_connection').select('*').eq('business_id', businessId).single();
    if (!connection) return new Response(JSON.stringify({ error: 'Meta not connected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const accessToken = connection.access_token_encrypted;

    let accountsToFetch: string[] = adAccountIds;
    if (!accountsToFetch || accountsToFetch.length === 0) {
      const { data: linked } = await supabase
        .from('client_meta_ad_accounts').select('ad_account_id').eq('active', true);
      accountsToFetch = [...new Set(linked?.map(a => a.ad_account_id) || [])];
    }
    const totalAccounts = accountsToFetch.length;
    accountsToFetch = accountsToFetch.slice(batchOffset, batchOffset + batchSize);

    const today = new Date();
    const defaultTo = today.toISOString().split('T')[0];
    const defaultFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
    const since = dateFrom || defaultFrom;
    const until = dateTo || defaultTo;

    let adsUpserted = 0;
    let metricsUpserted = 0;
    let creativesUpserted = 0;
    const errors: Array<{ account: string; error: string }> = [];

    for (const adAccountId of accountsToFetch) {
      try {
        // 1) Anúncios da conta (limite 500 por account — raras ultrapassam)
        const adsFields = 'id,name,status,effective_status,campaign_id,adset_id,creative{id},created_time,updated_time';
        const adsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/ads?fields=${adsFields}&limit=500&access_token=${accessToken}`;
        const adsRes = await fetch(adsUrl);
        const adsData = await adsRes.json();
        if (adsData.error) {
          errors.push({ account: adAccountId, error: adsData.error.message });
          continue;
        }
        const ads: MetaAd[] = adsData.data || [];
        const creativeIds = new Set<string>();
        for (const ad of ads) {
          const creativeId = ad.creative?.id || null;
          if (creativeId) creativeIds.add(creativeId);
          const { error } = await supabase.from('meta_ads').upsert({
            ad_id: ad.id,
            name: ad.name,
            status: ad.status ?? null,
            effective_status: ad.effective_status ?? null,
            campaign_id: ad.campaign_id ?? null,
            adset_id: ad.adset_id ?? null,
            ad_account_id: adAccountId,
            creative_id: creativeId,
            created_time: ad.created_time ?? null,
            updated_time: ad.updated_time ?? null,
            raw_json: ad,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: 'ad_id' });
          if (!error) adsUpserted++;
        }

        // 2) Criativos (thumbnail + texto)
        if (fetchCreatives && creativeIds.size > 0) {
          const ids = [...creativeIds].join(',');
          const creativeFields = 'id,name,title,body,thumbnail_url,image_url,video_id,object_type,instagram_permalink_url';
          const cUrl = `https://graph.facebook.com/v19.0/?ids=${ids}&fields=${creativeFields}&access_token=${accessToken}`;
          const cRes = await fetch(cUrl);
          const cData = await cRes.json();
          if (!cData.error) {
            for (const cid of creativeIds) {
              const c = cData[cid];
              if (!c) continue;
              const { error } = await supabase.from('meta_ad_creatives').upsert({
                creative_id: cid,
                ad_account_id: adAccountId,
                name: c.name ?? null,
                title: c.title ?? null,
                body: c.body ?? null,
                thumbnail_url: c.thumbnail_url ?? null,
                image_url: c.image_url ?? null,
                video_id: c.video_id ?? null,
                object_type: c.object_type ?? null,
                instagram_permalink: c.instagram_permalink_url ?? null,
                raw_json: c,
                last_synced_at: new Date().toISOString(),
              }, { onConflict: 'creative_id' });
              if (!error) creativesUpserted++;
            }
          }
        }

        // 3) Insights level=ad
        const insFields = 'ad_id,campaign_id,impressions,clicks,spend,reach,cpm,ctr,frequency,actions,cost_per_action_type';
        const insUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?level=ad&fields=${insFields}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&limit=1000&access_token=${accessToken}`;
        const insRes = await fetch(insUrl);
        const insData = await insRes.json();
        if (insData.error) {
          errors.push({ account: adAccountId, error: `insights: ${insData.error.message}` });
          continue;
        }
        const days: MetaInsights[] = insData.data || [];
        for (const d of days) {
          if (!d.ad_id) continue;
          const { error } = await supabase.from('meta_ad_metrics_daily').upsert({
            ad_id: d.ad_id,
            campaign_id: d.campaign_id ?? null,
            ad_account_id: adAccountId,
            date: d.date_start,
            platform: 'meta',
            metrics_json: buildMetrics(d),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'ad_id,date,platform' });
          if (!error) metricsUpserted++;
        }

        // Pagination: pega mais páginas se houver
        let nextUrl: string | null = insData.paging?.next || null;
        let pageCount = 1;
        while (nextUrl && pageCount < 10) {
          const pRes = await fetch(nextUrl);
          const pData = await pRes.json();
          if (pData.error) break;
          for (const d of (pData.data || []) as MetaInsights[]) {
            if (!d.ad_id) continue;
            const { error } = await supabase.from('meta_ad_metrics_daily').upsert({
              ad_id: d.ad_id,
              campaign_id: d.campaign_id ?? null,
              ad_account_id: adAccountId,
              date: d.date_start,
              platform: 'meta',
              metrics_json: buildMetrics(d),
              updated_at: new Date().toISOString(),
            }, { onConflict: 'ad_id,date,platform' });
            if (!error) metricsUpserted++;
          }
          nextUrl = pData.paging?.next || null;
          pageCount++;
        }
      } catch (err: any) {
        errors.push({ account: adAccountId, error: err?.message || 'exception' });
      }
    }

    const nextOffset = batchOffset + batchSize;
    const hasMore = nextOffset < totalAccounts;

    return new Response(JSON.stringify({
      success: true,
      accounts_processed: accountsToFetch.length,
      total_accounts: totalAccounts,
      batchOffset, nextOffset: hasMore ? nextOffset : null, hasMore,
      adsUpserted, metricsUpserted, creativesUpserted,
      errors: errors.slice(0, 10),
      dateRange: { from: since, to: until },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown';
    console.error('[meta-fetch-ad-metrics] Fatal:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
