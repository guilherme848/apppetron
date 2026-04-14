import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Clientes MatCon com conta Meta ativa
    const { data: links } = await supabase
      .from('client_meta_ad_accounts')
      .select('client_id, accounts(id, niche, niches(name))')
      .eq('active', true);

    const matconIds: string[] = (links || [])
      .filter((l: any) => {
        const n = l.accounts?.niches?.name || l.accounts?.niche;
        return n === 'Material de Construção';
      })
      .map((l: any) => l.accounts.id);

    // Filtrar pelos que NÃO tem config.enabled=false
    const { data: configs } = await supabase
      .from('matcon_report_config')
      .select('client_id, enabled')
      .in('client_id', matconIds);
    const disabledIds = new Set((configs || []).filter(c => !c.enabled).map(c => c.client_id));
    const toRun = matconIds.filter(id => !disabledIds.has(id));

    let generated = 0;
    const errors: Array<{ client_id: string; error: string }> = [];

    // Gera em série pra não estourar recursos
    for (const client_id of toRun) {
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/generate-matcon-report`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ client_id }),
        });
        const body = await res.json();
        if (body.success) generated++;
        else errors.push({ client_id, error: body.error || 'unknown' });
      } catch (err: any) {
        errors.push({ client_id, error: err?.message || 'fetch error' });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      matcon_clients: matconIds.length,
      disabled: disabledIds.size,
      processed: toRun.length,
      generated,
      errors: errors.slice(0, 10),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown';
    console.error('[matcon-report-weekly-cron] Fatal:', error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
