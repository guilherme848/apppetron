import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Orquestra backfill completo (conta + campanha + ad) pra uma ad_account específica.
 * Chamado quando cliente vincula nova conta pra garantir que dados apareçam
 * na Central de Monitoramento sem atraso.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const body = await req.json().catch(() => ({}));
    const { ad_account_id, days = 90 } = body;
    if (!ad_account_id) {
      return new Response(JSON.stringify({ error: 'ad_account_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const today = new Date();
    const dateTo = today.toISOString().split('T')[0];
    const past = new Date(today);
    past.setDate(past.getDate() - days);
    const dateFrom = past.toISOString().split('T')[0];

    const payload = { adAccountIds: [ad_account_id], dateFrom, dateTo };
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` };

    const results = {
      account_level: null as any,
      campaign_level: null as any,
      ad_level: null as any,
      errors: [] as string[],
    };

    // 1) Account level (puxa métricas no nível ad_account_metrics_daily)
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/meta-fetch-metrics`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
      });
      const data = await r.json();
      results.account_level = data;
      if (data.error) results.errors.push(`account: ${data.error}`);
    } catch (e: any) {
      results.errors.push(`account_exception: ${e?.message || 'unknown'}`);
    }

    // 2) Campaign level
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/meta-fetch-campaign-metrics`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(payload),
      });
      const data = await r.json();
      results.campaign_level = data;
      if (data.error) results.errors.push(`campaign: ${data.error}`);
    } catch (e: any) {
      results.errors.push(`campaign_exception: ${e?.message || 'unknown'}`);
    }

    // 3) Ad level (usa batchSize:1 pra 1 conta só)
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/meta-fetch-ad-metrics`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ ...payload, batchSize: 1, batchOffset: 0 }),
      });
      const data = await r.json();
      results.ad_level = data;
      if (data.error) results.errors.push(`ad: ${data.error}`);
    } catch (e: any) {
      results.errors.push(`ad_exception: ${e?.message || 'unknown'}`);
    }

    return new Response(JSON.stringify({
      success: results.errors.length === 0,
      ad_account_id,
      date_range: { from: dateFrom, to: dateTo },
      ...results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
