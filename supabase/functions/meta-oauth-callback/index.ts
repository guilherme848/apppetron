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
    const url = new URL(req.url);
    const code = url.searchParams.get('code');

    if (!code) {
      console.error('No code provided in callback');
      return new Response('Missing authorization code', { status: 400, headers: corsHeaders });
    }

    const appId = Deno.env.get('META_APP_ID');
    const appSecret = Deno.env.get('META_APP_SECRET');
    const redirectUrl = Deno.env.get('META_REDIRECT_URL');
    const businessId = Deno.env.get('META_BUSINESS_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!appId || !appSecret || !redirectUrl || !businessId || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response('Server configuration error', { status: 500, headers: corsHeaders });
    }

    // Exchange code for short-lived token
    console.log('Exchanging code for access token...');
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('redirect_uri', redirectUrl);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error);
      return new Response(`Token error: ${tokenData.error.message}`, { status: 400, headers: corsHeaders });
    }

    const shortLivedToken = tokenData.access_token;
    console.log('Got short-lived token, exchanging for long-lived...');

    // Exchange for long-lived token
    const longLivedUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedUrl.searchParams.set('client_id', appId);
    longLivedUrl.searchParams.set('client_secret', appSecret);
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

    const longLivedResponse = await fetch(longLivedUrl.toString());
    const longLivedData = await longLivedResponse.json();

    if (longLivedData.error) {
      console.error('Long-lived token error:', longLivedData.error);
      return new Response(`Long-lived token error: ${longLivedData.error.message}`, { status: 400, headers: corsHeaders });
    }

    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in || 5184000; // Default 60 days
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    console.log('Got long-lived token, saving to database...');

    // Save to Supabase
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Upsert the connection (only one BM connection)
    const { error: upsertError } = await supabase
      .from('meta_bm_connection')
      .upsert({
        business_id: businessId,
        access_token_encrypted: accessToken, // In production, encrypt this
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'business_id',
      });

    if (upsertError) {
      console.error('Database error:', upsertError);
      return new Response(`Database error: ${upsertError.message}`, { status: 500, headers: corsHeaders });
    }

    console.log('Meta BM connection saved successfully');

    // Return HTML that closes the popup and notifies parent
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Conectado!</title></head>
        <body>
          <h2>Conectado com sucesso!</h2>
          <p>Esta janela será fechada automaticamente...</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'META_OAUTH_SUCCESS' }, '*');
            }
            setTimeout(() => window.close(), 1500);
          </script>
        </body>
      </html>
    `;

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in meta-oauth-callback:', error);
    return new Response(`Error: ${message}`, { status: 500, headers: corsHeaders });
  }
});
