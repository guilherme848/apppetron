import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adAccountIds } = await req.json();

    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!businessId || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
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
      console.error('No Meta connection found:', connError);
      return new Response(
        JSON.stringify({ error: 'Meta not connected' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token_encrypted;

    // If no specific accounts provided, fetch all
    let accountsToFetch = adAccountIds;
    if (!accountsToFetch || accountsToFetch.length === 0) {
      const { data: allAccounts } = await supabase
        .from('meta_bm_ad_accounts')
        .select('ad_account_id');
      accountsToFetch = allAccounts?.map(a => a.ad_account_id) || [];
    }

    console.log(`Fetching finance data for ${accountsToFetch.length} accounts`);

    const results = [];

    for (const adAccountId of accountsToFetch) {
      try {
        // Fetch account insights
        const graphUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=name,currency,amount_spent,spend_cap&access_token=${accessToken}`;
        
        const response = await fetch(graphUrl);
        const data = await response.json();

        if (data.error) {
          console.error(`Error fetching ${adAccountId}:`, data.error);
          continue;
        }

        // amount_spent comes in cents, spend_cap too
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
          console.error('Error saving snapshot:', insertError);
        }

        results.push({
          ad_account_id: adAccountId,
          name: data.name,
          currency: data.currency,
          amount_spent: amountSpent,
          spend_cap: spendCap,
          available_balance: availableBalance,
        });
      } catch (err) {
        console.error(`Error processing ${adAccountId}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: results.length,
        snapshots: results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in meta-fetch-finance:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
