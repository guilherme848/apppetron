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

/**
 * This function is designed to be called by a cron job every 3 hours.
 * It fetches:
 * 1. Financial data (balances) for all linked ad accounts
 * 2. Performance metrics for the last 7 days
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[meta-sync-all-cron] Starting scheduled sync...');

  try {
    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      console.error('[meta-sync-all-cron] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the stored Meta connection
    const { data: connection, error: connError } = await supabase
      .from('meta_bm_connection')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (connError || !connection) {
      console.log('[meta-sync-all-cron] No Meta connection found, skipping...');
      return new Response(
        JSON.stringify({ success: false, message: 'Meta not connected' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token_encrypted;

    // Get all active client-ad account links
    const { data: clientLinks, error: linksError } = await supabase
      .from('client_meta_ad_accounts')
      .select('ad_account_id')
      .eq('active', true);

    if (linksError) {
      console.error('[meta-sync-all-cron] Error fetching client links:', linksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch client links' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique ad account IDs
    const uniqueAccountIds = [...new Set(clientLinks?.map(l => l.ad_account_id) || [])];

    if (uniqueAccountIds.length === 0) {
      console.log('[meta-sync-all-cron] No linked ad accounts to sync');
      return new Response(
        JSON.stringify({ success: true, message: 'No accounts to sync', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[meta-sync-all-cron] Syncing ${uniqueAccountIds.length} ad accounts...`);

    let balanceSuccessCount = 0;
    let balanceErrorCount = 0;
    let metricsSuccessCount = 0;
    let metricsErrorCount = 0;

    // Date range for metrics: last 7 days
    const today = new Date();
    const dateTo = today.toISOString().split('T')[0];
    const dateFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];

    for (const adAccountId of uniqueAccountIds) {
      // ===== 1. FETCH BALANCE =====
      try {
        const balanceUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=name,currency,amount_spent,spend_cap&access_token=${accessToken}`;
        const balanceResponse = await fetch(balanceUrl);
        const balanceData = await balanceResponse.json();

        if (balanceData.error) {
          console.error(`[meta-sync-all-cron] Balance error for ${adAccountId}:`, balanceData.error.message);
          balanceErrorCount++;
        } else {
          const amountSpent = balanceData.amount_spent ? parseFloat(balanceData.amount_spent) / 100 : null;
          const spendCap = balanceData.spend_cap ? parseFloat(balanceData.spend_cap) / 100 : null;
          const availableBalance = spendCap !== null && amountSpent !== null 
            ? spendCap - amountSpent 
            : null;

          const { error: insertError } = await supabase
            .from('meta_ad_account_snapshots')
            .insert({
              ad_account_id: adAccountId,
              amount_spent: amountSpent,
              spend_cap: spendCap,
              available_balance: availableBalance,
              raw_json: balanceData,
            });

          if (insertError) {
            console.error(`[meta-sync-all-cron] Snapshot insert error for ${adAccountId}:`, insertError);
            balanceErrorCount++;
          } else {
            balanceSuccessCount++;
          }
        }
      } catch (err) {
        console.error(`[meta-sync-all-cron] Balance fetch exception for ${adAccountId}:`, err);
        balanceErrorCount++;
      }

      // ===== 2. FETCH METRICS =====
      try {
        const fields = [
          'impressions', 'clicks', 'spend', 'reach', 'cpm', 'cpc', 'ctr',
          'actions', 'cost_per_action_type', 'website_ctr',
        ].join(',');
        
        const metricsUrl = `https://graph.facebook.com/v19.0/${adAccountId}/insights?fields=${fields}&time_range={"since":"${dateFrom}","until":"${dateTo}"}&time_increment=1&access_token=${accessToken}`;
        const metricsResponse = await fetch(metricsUrl);
        const metricsData = await metricsResponse.json();

        if (metricsData.error) {
          console.error(`[meta-sync-all-cron] Metrics error for ${adAccountId}:`, metricsData.error.message);
          metricsErrorCount++;
          continue;
        }

        if (!metricsData.data || metricsData.data.length === 0) {
          console.log(`[meta-sync-all-cron] No metrics data for ${adAccountId}`);
          continue;
        }

        // Process each day's data
        for (const dayData of metricsData.data as MetaInsightsData[]) {
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
          
          const totalWhatsappConversations = whatsappConversations + messagingReplies;
          
          const pageEngagement = findActionValue(dayData.actions, ['page_engagement', 'post_engagement']);
          const profileVisits = findActionValue(dayData.actions, ['landing_page_view', 'link_click']);
          const leads = findActionValue(dayData.actions, ['lead', 'lead.fb', 'onsite_conversion.lead_grouped']);
          const conversions = findActionValue(dayData.actions, ['omni_purchase', 'purchase', 'complete_registration']);
          const costPerLead = findCostPerAction(dayData.cost_per_action_type, ['lead', 'lead.fb', 'onsite_conversion.lead_grouped']);
          const engagement = findActionValue(dayData.actions, ['post_engagement', 'page_engagement', 'post_reaction', 'comment', 'post', 'like']);

          const spendValue = parseFloat(dayData.spend || '0');
          
          const metricsJson = {
            impressions: parseInt(dayData.impressions || '0'),
            reach: parseInt(dayData.reach || '0'),
            spend: spendValue,
            link_clicks: parseInt(dayData.clicks || '0'),
            clicks: parseInt(dayData.clicks || '0'),
            cpm: parseFloat(dayData.cpm || '0'),
            cpc: parseFloat(dayData.cpc || '0'),
            ctr: parseFloat(dayData.ctr || '0'),
            conversions,
            leads,
            purchases: 0,
            purchase_value: 0,
            whatsapp_clicks: whatsappClicks,
            whatsapp_conversations: totalWhatsappConversations,
            messaging_replies: messagingReplies,
            cost_per_message: totalWhatsappConversations > 0 
              ? parseFloat((spendValue / totalWhatsappConversations).toFixed(2)) 
              : 0,
            page_engagement: pageEngagement,
            profile_visits: profileVisits,
            engagement: engagement || pageEngagement,
            cost_per_lead: costPerLead,
          };

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
            console.error(`[meta-sync-all-cron] Metrics upsert error for ${adAccountId} on ${date}:`, upsertError);
          }
        }

        metricsSuccessCount++;
      } catch (err) {
        console.error(`[meta-sync-all-cron] Metrics fetch exception for ${adAccountId}:`, err);
        metricsErrorCount++;
      }
    }

    console.log(`[meta-sync-all-cron] Completed. Balances: ${balanceSuccessCount}/${uniqueAccountIds.length}, Metrics: ${metricsSuccessCount}/${uniqueAccountIds.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Sync completed',
        accounts: uniqueAccountIds.length,
        balances: { success: balanceSuccessCount, errors: balanceErrorCount },
        metrics: { success: metricsSuccessCount, errors: metricsErrorCount },
        dateRange: { from: dateFrom, to: dateTo },
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta-sync-all-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
