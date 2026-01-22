import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * This function is designed to be called by a cron job every 6 hours.
 * It fetches the latest financial data for all linked ad accounts.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[meta-refresh-balances-cron] Starting scheduled refresh...');

  try {
    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      console.error('[meta-refresh-balances-cron] Missing required environment variables');
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
      console.log('[meta-refresh-balances-cron] No Meta connection found, skipping...');
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
      console.error('[meta-refresh-balances-cron] Error fetching client links:', linksError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch client links' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unique ad account IDs
    const uniqueAccountIds = [...new Set(clientLinks?.map(l => l.ad_account_id) || [])];

    if (uniqueAccountIds.length === 0) {
      console.log('[meta-refresh-balances-cron] No linked ad accounts to refresh');
      return new Response(
        JSON.stringify({ success: true, message: 'No accounts to refresh', count: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[meta-refresh-balances-cron] Refreshing ${uniqueAccountIds.length} ad accounts...`);

    let successCount = 0;
    let errorCount = 0;

    for (const adAccountId of uniqueAccountIds) {
      try {
        // Fetch account insights from Meta Graph API
        const graphUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=name,currency,amount_spent,spend_cap&access_token=${accessToken}`;
        
        const response = await fetch(graphUrl);
        const data = await response.json();

        if (data.error) {
          console.error(`[meta-refresh-balances-cron] Error fetching ${adAccountId}:`, data.error.message);
          errorCount++;
          continue;
        }

        // amount_spent and spend_cap come in cents
        const amountSpent = data.amount_spent ? parseFloat(data.amount_spent) / 100 : null;
        const spendCap = data.spend_cap ? parseFloat(data.spend_cap) / 100 : null;
        const availableBalance = spendCap !== null && amountSpent !== null 
          ? spendCap - amountSpent 
          : null;

        // Save snapshot
        const { error: insertError } = await supabase
          .from('meta_ad_account_snapshots')
          .insert({
            ad_account_id: adAccountId,
            amount_spent: amountSpent,
            spend_cap: spendCap,
            available_balance: availableBalance,
            raw_json: data,
          });

        if (insertError) {
          console.error(`[meta-refresh-balances-cron] Error saving snapshot for ${adAccountId}:`, insertError);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error(`[meta-refresh-balances-cron] Error processing ${adAccountId}:`, err);
        errorCount++;
      }
    }

    console.log(`[meta-refresh-balances-cron] Completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Balance refresh completed',
        total: uniqueAccountIds.length,
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta-refresh-balances-cron] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
