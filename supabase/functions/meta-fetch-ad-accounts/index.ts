import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MetaAdAccount {
  id: string;
  name: string;
  account_id: string;
  currency: string;
}

interface MetaApiResponse {
  data: MetaAdAccount[];
  paging?: {
    next?: string;
    cursors?: {
      after?: string;
    };
  };
  error?: {
    message: string;
  };
}

async function fetchAllPages(baseUrl: string, accessToken: string): Promise<MetaAdAccount[]> {
  const allAccounts: MetaAdAccount[] = [];
  let nextUrl: string | null = `${baseUrl}&access_token=${accessToken}&limit=200`;

  while (nextUrl) {
    console.log(`Fetching page... (${allAccounts.length} accounts so far)`);
    const response = await fetch(nextUrl);
    const data: MetaApiResponse = await response.json();

    if (data.error) {
      console.error('Meta API error:', data.error);
      throw new Error(data.error.message);
    }

    if (data.data && data.data.length > 0) {
      allAccounts.push(...data.data);
    }

    // Check for next page
    nextUrl = data.paging?.next || null;
  }

  return allAccounts;
}

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

    console.log('Fetching all ad accounts from BM:', businessId);
    
    // Fetch BOTH owned and client ad accounts
    const [ownedAccounts, clientAccounts] = await Promise.all([
      fetchAllPages(
        `https://graph.facebook.com/v19.0/${businessId}/owned_ad_accounts?fields=id,name,account_id,currency`,
        accessToken
      ).catch(err => {
        console.error('Error fetching owned_ad_accounts:', err);
        return [];
      }),
      fetchAllPages(
        `https://graph.facebook.com/v19.0/${businessId}/client_ad_accounts?fields=id,name,account_id,currency`,
        accessToken
      ).catch(err => {
        console.error('Error fetching client_ad_accounts:', err);
        return [];
      }),
    ]);

    console.log(`Found ${ownedAccounts.length} owned accounts and ${clientAccounts.length} client accounts`);

    // Merge and deduplicate by account_id
    const allAccountsMap = new Map<string, MetaAdAccount>();
    
    for (const account of [...ownedAccounts, ...clientAccounts]) {
      const adAccountId = account.id.startsWith('act_') ? account.id : `act_${account.account_id}`;
      if (!allAccountsMap.has(adAccountId)) {
        allAccountsMap.set(adAccountId, { ...account, id: adAccountId });
      }
    }

    const allAdAccounts = Array.from(allAccountsMap.values());
    console.log(`Total unique ad accounts: ${allAdAccounts.length}`);

    // Upsert each ad account
    for (const account of allAdAccounts) {
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

    console.log(`Sync complete. ${allAdAccounts.length} accounts synced.`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: allAdAccounts.length,
        owned: ownedAccounts.length,
        client: clientAccounts.length,
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
