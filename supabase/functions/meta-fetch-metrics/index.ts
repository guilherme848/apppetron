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
  website_ctr?: Array<{ action_type: string; value: string }>;
  cost_per_action_type?: Array<{ action_type: string; value: string }>;
  date_start: string;
  date_stop: string;
}

// Helper to find action value
function findActionValue(actions: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!actions) return 0;
  for (const type of types) {
    const action = actions.find(a => a.action_type === type);
    if (action) return parseFloat(action.value) || 0;
  }
  return 0;
}

// Helper to find cost per action
function findCostPerAction(costs: Array<{ action_type: string; value: string }> | undefined, types: string[]): number {
  if (!costs) return 0;
  for (const type of types) {
    const cost = costs.find(c => c.action_type === type);
    if (cost) return parseFloat(cost.value) || 0;
  }
  return 0;
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
        // Fetch insights with daily breakdown - extended fields for local business metrics
        const fields = [
          'impressions',
          'clicks',
          'spend',
          'reach',
          'cpm',
          'cpc',
          'ctr',
          'actions',
          'cost_per_action_type',
          'website_ctr',
        ].join(',');
        
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
          
          // WhatsApp related metrics
          const whatsappClicks = findActionValue(dayData.actions, [
            'onsite_conversion.messaging_conversation_started_7d',
            'onsite_conversion.messaging_first_reply',
            'contact_total',
          ]);
          
          const whatsappConversations = findActionValue(dayData.actions, [
            'onsite_conversion.messaging_conversation_started_7d',
            'messaging_conversation_started_7d',
          ]);
          
          const messagingReplies = findActionValue(dayData.actions, [
            'onsite_conversion.messaging_first_reply',
            'messaging_first_reply',
          ]);
          
          // Cost per messaging action
          const costPerMessage = findCostPerAction(dayData.cost_per_action_type, [
            'onsite_conversion.messaging_conversation_started_7d',
            'messaging_conversation_started_7d',
            'onsite_conversion.messaging_first_reply',
          ]);
          
          // Profile/Page interactions
          const pageEngagement = findActionValue(dayData.actions, [
            'page_engagement',
            'post_engagement',
          ]);
          
          const profileVisits = findActionValue(dayData.actions, [
            'landing_page_view',
            'link_click',
          ]);
          
          // Lead/Contact metrics for local business
          const leads = findActionValue(dayData.actions, [
            'lead',
            'lead.fb',
            'onsite_conversion.lead_grouped',
          ]);
          
          const phoneCallClicks = findActionValue(dayData.actions, [
            'onsite_conversion.post_save',
            'contact_total',
          ]);
          
          // Conversions (purchases, etc.)
          const conversions = findActionValue(dayData.actions, [
            'omni_purchase',
            'purchase',
            'complete_registration',
          ]);
          
          // Cost per lead
          const costPerLead = findCostPerAction(dayData.cost_per_action_type, [
            'lead',
            'lead.fb',
            'onsite_conversion.lead_grouped',
          ]);

          const metricsJson = {
            // Basic metrics
            impressions: parseInt(dayData.impressions || '0'),
            clicks: parseInt(dayData.clicks || '0'),
            spend: parseFloat(dayData.spend || '0'),
            reach: parseInt(dayData.reach || '0'),
            cpm: parseFloat(dayData.cpm || '0'),
            cpc: parseFloat(dayData.cpc || '0'),
            ctr: parseFloat(dayData.ctr || '0'),
            
            // Conversion metrics
            conversions: conversions,
            leads: leads,
            
            // WhatsApp/Messaging metrics
            whatsapp_clicks: whatsappClicks,
            whatsapp_conversations: whatsappConversations,
            messaging_replies: messagingReplies,
            cost_per_message: costPerMessage,
            
            // Profile/Engagement metrics
            page_engagement: pageEngagement,
            profile_visits: profileVisits,
            
            // Cost metrics
            cost_per_lead: costPerLead,
            
            // Raw data for debugging
            raw_actions: dayData.actions || [],
            raw_costs: dayData.cost_per_action_type || [],
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
