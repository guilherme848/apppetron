import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const BATCH = 3;

    const totals = { adsUpserted: 0, metricsUpserted: 0, creativesUpserted: 0, errors: 0 };
    let offset = 0;
    let hasMore = true;
    let calls = 0;

    while (hasMore && calls < 20) {
      const res = await fetch(`${supabaseUrl}/functions/v1/meta-fetch-ad-metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({ batchSize: BATCH, batchOffset: offset }),
      });
      const data = await res.json();
      calls++;
      if (!data.success) {
        totals.errors += 1;
        break;
      }
      totals.adsUpserted += data.adsUpserted || 0;
      totals.metricsUpserted += data.metricsUpserted || 0;
      totals.creativesUpserted += data.creativesUpserted || 0;
      hasMore = data.hasMore;
      offset = data.nextOffset ?? offset + BATCH;
    }

    return new Response(JSON.stringify({ success: true, calls, ...totals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
