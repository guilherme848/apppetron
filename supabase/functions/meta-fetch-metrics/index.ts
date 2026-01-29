import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaInsightsData {
  impressions?: string;
  clicks?: string;
  spend?: string;
  reach?: string;
  cpm?: string;
  cpc?: string;
  ctr?: string;
  actions?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adAccountIds, dateFrom, dateTo } = await req.json();

    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      console.error('[meta-fetch-metrics] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the stored connection
    const { data: connection, error: connError } = await supabase
      .from('meta_bm_connection')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (connError || !connection) {
      console.error('[meta-fetch-metrics] No Meta connection found:', connError);
      return new Response(
        JSON.stringify({ error: 'Meta not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token_encrypted;

    // If no specific accounts provided, fetch all linked accounts
    let accountsToFetch = adAccountIds;
    if (!accountsToFetch || accountsToFetch.length === 0) {
      const { data: linkedAccounts } = await supabase
        .from('client_meta_ad_accounts')
        .select('ad_account_id')
        .eq('active', true);
      accountsToFetch = [...new Set(linkedAccounts?.map(a => a.ad_account_id) || [])];
    }

    if (accountsToFetch.length === 0) {
      console.log('[meta-fetch-metrics] No accounts to fetch metrics for');
      return new Response(
        JSON.stringify({ success: true, message: 'No accounts to fetch', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default date range: last 30 days
    const today = new Date();
    const defaultDateTo = today.toISOString().split('T')[0];
    const defaultDateFrom = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
    
    const since = dateFrom || defaultDateFrom;
    const until = dateTo || defaultDateTo;

    console.log(`[meta-fetch-metrics] Fetching metrics for ${accountsToFetch.length} accounts from ${since} to ${until}`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const adAccountId of accountsToFetch) {
      try {
        // Fetch insights with daily breakdown
        const fields = 'impressions,clicks,spend,reach,cpm,cpc,ctr,actions';
        const graphUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&time_increment=1&access_token=${accessToken}`;
        
        console.log(`[meta-fetch-metrics] Fetching ${adAccountId}...`);
        const response = await fetch(graphUrl);
        const data = await response.json();

        if (data.error) {
          console.error(`[meta-fetch-metrics] Error fetching ${adAccountId}:`, data.error.message);
          errorCount++;
          continue;
        }

        if (!data.data || data.data.length === 0) {
          console.log(`[meta-fetch-metrics] No data for ${adAccountId}`);
          continue;
        }

        // Process each day's data
        for (const dayData of data.data as MetaInsightsData[]) {
          const date = dayData.date_start;
          
          // Extract conversions from actions
          const conversions = dayData.actions?.find(a => 
            a.action_type === 'omni_purchase' || 
            a.action_type === 'purchase' ||
            a.action_type === 'lead'
          )?.value || '0';

          const metricsJson = {
            impressions: parseInt(dayData.impressions || '0'),
            clicks: parseInt(dayData.clicks || '0'),
            spend: parseFloat(dayData.spend || '0'),
            reach: parseInt(dayData.reach || '0'),
            cpm: parseFloat(dayData.cpm || '0'),
            cpc: parseFloat(dayData.cpc || '0'),
            ctr: parseFloat(dayData.ctr || '0'),
            conversions: parseInt(conversions),
            raw_actions: dayData.actions || [],
          };

          // Upsert the daily metrics
          const { error: upsertError } = await supabase
            .from('ad_account_metrics_daily')
            .upsert({
              ad_account_id: adAccountId,
              date: date,
              platform: 'meta',
              metrics_json: metricsJson,
            }, {
              onConflict: 'ad_account_id,date,platform',
            });

          if (upsertError) {
            console.error(`[meta-fetch-metrics] Error upserting metrics for ${adAccountId} on ${date}:`, upsertError);
          }
        }

        results.push({
          ad_account_id: adAccountId,
          days_fetched: data.data.length,
        });
        successCount++;

      } catch (err) {
        console.error(`[meta-fetch-metrics] Error processing ${adAccountId}:`, err);
        errorCount++;
      }
    }

    console.log(`[meta-fetch-metrics] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Metrics fetch completed',
        total: accountsToFetch.length,
        successCount,
        errorCount,
        results,
        dateRange: { from: since, to: until },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta-fetch-metrics] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
