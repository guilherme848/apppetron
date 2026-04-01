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
      console.error('[meta-fetch-finance] Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
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
      console.error('[meta-fetch-finance] No Meta connection found:', connError);
      return new Response(
        JSON.stringify({ error: 'Meta Ads não conectado. Conecte sua conta nas configurações.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token expiration
    if (connection.token_expires_at) {
      const expiresAt = new Date(connection.token_expires_at);
      if (expiresAt < new Date()) {
        console.error('[meta-fetch-finance] Token expired at:', connection.token_expires_at);
        return new Response(
          JSON.stringify({ 
            error: 'Token do Meta Ads expirado. Reconecte sua conta Meta nas configurações.',
            errorCode: 'TOKEN_EXPIRED',
            expiredAt: connection.token_expires_at,
          }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
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

    console.log(`[meta-fetch-finance] Fetching finance data for ${accountsToFetch.length} accounts`);

    const results = [];
    let errorCount = 0;
    let tokenError = false;

    for (const adAccountId of accountsToFetch) {
      try {
        const graphUrl = `https://graph.facebook.com/v19.0/${adAccountId}?fields=name,currency,amount_spent,spend_cap&access_token=${accessToken}`;
        
        const response = await fetch(graphUrl);
        const data = await response.json();

        if (data.error) {
          console.error(`[meta-fetch-finance] Meta API error for ${adAccountId}:`, JSON.stringify(data.error));
          
          // Detect token/auth errors
          const code = data.error.code;
          const subcode = data.error.error_subcode;
          if (code === 190 || subcode === 463 || subcode === 467) {
            tokenError = true;
            break; // No point continuing if token is invalid
          }
          
          errorCount++;
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
          console.error('[meta-fetch-finance] Error saving snapshot:', insertError);
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
        console.error(`[meta-fetch-finance] Error processing ${adAccountId}:`, err);
        errorCount++;
      }
    }

    if (tokenError) {
      console.error('[meta-fetch-finance] Token is invalid/expired (Meta API code 190)');
      return new Response(
        JSON.stringify({ 
          error: 'Token do Meta Ads expirado ou revogado. Reconecte sua conta Meta.',
          errorCode: 'TOKEN_EXPIRED',
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[meta-fetch-finance] Completed. Success: ${results.length}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: results.length,
        errorCount,
        snapshots: results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[meta-fetch-finance] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
