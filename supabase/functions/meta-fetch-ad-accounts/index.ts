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
        JSON.stringify({ error: 'Meta not connected. Please connect first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = connection.access_token_encrypted;

    // Fetch ad accounts from Meta Graph API
    console.log('Fetching ad accounts from BM:', businessId);
    const graphUrl = `https://graph.facebook.com/v19.0/${businessId}/owned_ad_accounts?fields=id,name,account_id,currency&access_token=${accessToken}&limit=500`;

    const response = await fetch(graphUrl);
    const data = await response.json();

    if (data.error) {
      console.error('Meta API error:', data.error);
      return new Response(
        JSON.stringify({ error: data.error.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adAccounts = data.data || [];
    console.log(`Found ${adAccounts.length} ad accounts`);

    // Upsert each ad account
    for (const account of adAccounts) {
      const adAccountId = account.id.startsWith('act_') ? account.id : `act_${account.account_id}`;
      
      const { error: upsertError } = await supabase
        .from('meta_bm_ad_accounts')
        .upsert({
          ad_account_id: adAccountId,
          name: account.name,
          currency: account.currency,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'ad_account_id',
        });

      if (upsertError) {
        console.error('Error upserting ad account:', upsertError);
      }
    }

    // Fetch updated list from database
    const { data: savedAccounts } = await supabase
      .from('meta_bm_ad_accounts')
      .select('*')
      .order('name');

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: adAccounts.length,
        accounts: savedAccounts 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in meta-fetch-ad-accounts:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
