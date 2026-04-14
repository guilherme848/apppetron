import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isoDate(d: Date) { return d.toISOString().split('T')[0]; }

function sumDaily(rows: any[]) {
  const t = { spend: 0, impressions: 0, reach: 0, clicks: 0, conversations: 0, leads: 0, profile_visits: 0, freq_sum: 0, freq_count: 0 };
  for (const r of rows) {
    const j = r.metrics_json || {};
    t.spend += Number(j.spend) || 0;
    t.impressions += Number(j.impressions) || 0;
    t.reach += Number(j.reach) || 0;
    t.clicks += Number(j.clicks) || 0;
    t.conversations += Number(j.whatsapp_conversations) || 0;
    t.leads += Number(j.leads) || 0;
    t.profile_visits += Number(j.profile_visits) || 0;
    const f = Number(j.frequency) || 0;
    if (f > 0) { t.freq_sum += f; t.freq_count += 1; }
  }
  return {
    spend: t.spend,
    impressions: t.impressions,
    reach: t.reach,
    clicks: t.clicks,
    conversations: t.conversations,
    leads: t.leads,
    profile_visits: t.profile_visits,
    cpm: t.impressions > 0 ? (t.spend / t.impressions) * 1000 : 0,
    unique_ctr: t.reach > 0 ? (t.clicks / t.reach) * 100 : 0,
    cost_per_conversation: t.conversations > 0 ? t.spend / t.conversations : 0,
    conversion_rate: t.clicks > 0 ? (t.conversations / t.clicks) * 100 : 0,
    frequency_avg: t.freq_count > 0 ? t.freq_sum / t.freq_count : 0,
  };
}

function pctDelta(curr: number, prev: number) {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

interface NarrativeSection {
  title: string;
  body: string;
}

async function generateNarrative(
  clientName: string,
  current: ReturnType<typeof sumDaily>,
  previous: ReturnType<typeof sumDaily>,
  periodLabel: string,
): Promise<{ highlights: NarrativeSection[]; summary: string; next_steps: string[] }> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    // Fallback: narrativa gerada por template sem IA
    return fallbackNarrative(current, previous, periodLabel);
  }

  const prompt = `Você é o assistente de redação da Agência Petron, que gera relatórios para donos de lojas e empresas do setor de materiais de construção.

REGRAS ABSOLUTAS:
- Tom SEMPRE positivo e simples. Cliente é dono de loja, não marketeiro.
- Jargão proibido: não use "CPM", "CTR", "CPL" sem contextualizar.
- Nunca assuste. Qualquer indicador com queda vira "oportunidade que já estamos atacando".
- Nunca mencione quantidade de clientes da agência ou dados internos.
- Use benchmark do SETOR genericamente ("acima da média do setor").
- Frases curtas. 1-2 linhas por parágrafo.
- Enaltece o trabalho da equipe Petron sem soar bajulador.

Cliente: ${clientName}
Período: ${periodLabel}

Dados do período atual:
- Conversas no WhatsApp: ${current.conversations}
- Custo por conversa: R$ ${current.cost_per_conversation.toFixed(2)}
- Alcance (pessoas únicas impactadas): ${current.reach}
- Impressões: ${current.impressions}
- Cliques: ${current.clicks}
- Visitas no perfil: ${current.profile_visits}
- Taxa de conversão clique→conversa: ${current.conversion_rate.toFixed(1)}%
- Custo pra aparecer 1000 vezes: R$ ${current.cpm.toFixed(2)}
- Frequência média: ${current.frequency_avg.toFixed(1)}
- Investimento: R$ ${current.spend.toFixed(2)}

Comparativo com período anterior:
- Conversas: ${pctDelta(current.conversations, previous.conversations).toFixed(0)}%
- Custo/conversa: ${pctDelta(current.cost_per_conversation, previous.cost_per_conversation).toFixed(0)}%
- Alcance: ${pctDelta(current.reach, previous.reach).toFixed(0)}%

Gere JSON com este formato EXATO (sem nenhum texto fora do JSON):
{
  "summary": "1-2 frases abrindo o relatório com tom positivo e uma mensagem-chave da semana",
  "highlights": [
    {"title": "💬 Conversas no WhatsApp", "body": "1-2 frases simples sobre conversas"},
    {"title": "💰 Custo por conversa", "body": "1-2 frases simples sobre eficiência de gasto"},
    {"title": "📣 Alcance", "body": "1-2 frases simples sobre quantas pessoas foram impactadas"}
  ],
  "next_steps": [
    "Ação 1 concreta (1 frase)",
    "Ação 2 concreta (1 frase)",
    "Ação 3 concreta (1 frase)"
  ]
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await response.json();
    const text = data?.content?.[0]?.text || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    return JSON.parse(match[0]);
  } catch (err) {
    console.error('[generate-matcon-report] narrative fallback:', err);
    return fallbackNarrative(current, previous, periodLabel);
  }
}

function fallbackNarrative(current: ReturnType<typeof sumDaily>, previous: ReturnType<typeof sumDaily>, periodLabel: string) {
  const convDelta = pctDelta(current.conversations, previous.conversations);
  const costDelta = pctDelta(current.cost_per_conversation, previous.cost_per_conversation);
  return {
    summary: `Aqui vai o resumo dos resultados em ${periodLabel}. Nossa equipe segue ativamente otimizando suas campanhas.`,
    highlights: [
      {
        title: '💬 Conversas no WhatsApp',
        body: current.conversations > 0
          ? `Foram ${current.conversations} conversas no WhatsApp${convDelta > 0 ? ` — crescimento de ${Math.round(convDelta)}% vs. período anterior` : ''}.`
          : 'Estamos trabalhando em novas criatividades pra aumentar o volume de contatos.',
      },
      {
        title: '💰 Custo por conversa',
        body: current.cost_per_conversation > 0
          ? `Cada contato está custando R$ ${current.cost_per_conversation.toFixed(2)}${costDelta < 0 ? ' — redução positiva vs. período anterior' : ''}.`
          : 'Nossa equipe está ajustando as configurações para otimizar este indicador.',
      },
      {
        title: '📣 Alcance',
        body: `Impactamos ${current.reach.toLocaleString('pt-BR')} pessoas únicas no período.`,
      },
    ],
    next_steps: [
      'Analisar criativos com melhor desempenho e amplificar os que converteram mais.',
      'Refinar segmentações para manter a eficiência de custo.',
      'Testar novas variações de anúncios na semana seguinte.',
    ],
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json().catch(() => ({}));
    const { client_id, period_start, period_end, period_type = 'weekly' } = body;

    if (!client_id) {
      return new Response(JSON.stringify({ error: 'client_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Período default = última semana completa (seg-dom anterior)
    const today = new Date();
    let periodStart: string, periodEnd: string;
    if (period_start && period_end) {
      periodStart = period_start;
      periodEnd = period_end;
    } else {
      const end = new Date(today);
      end.setDate(end.getDate() - ((end.getDay() + 7) % 7 || 7)); // último domingo
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      periodStart = isoDate(start);
      periodEnd = isoDate(end);
    }
    const prevEnd = new Date(new Date(periodStart).getTime() - 86400000);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 6);
    const prevStartStr = isoDate(prevStart);
    const prevEndStr = isoDate(prevEnd);

    // Busca cliente e ad account
    const { data: client, error: clientErr } = await supabase
      .from('accounts')
      .select('id, name, ad_monthly_budget')
      .eq('id', client_id)
      .single();
    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: 'Client not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: link } = await supabase
      .from('client_meta_ad_accounts')
      .select('ad_account_id')
      .eq('client_id', client_id)
      .eq('active', true)
      .limit(1)
      .single();
    const adAccountId = link?.ad_account_id || null;

    // Métricas
    let current = sumDaily([]);
    let previous = sumDaily([]);
    if (adAccountId) {
      const { data: metrics } = await supabase
        .from('ad_account_metrics_daily')
        .select('date, metrics_json')
        .eq('ad_account_id', adAccountId)
        .eq('platform', 'meta')
        .gte('date', prevStartStr).lte('date', periodEnd)
        .limit(1000);
      const curr = (metrics || []).filter(m => m.date >= periodStart && m.date <= periodEnd);
      const prev = (metrics || []).filter(m => m.date >= prevStartStr && m.date <= prevEndStr);
      current = sumDaily(curr);
      previous = sumDaily(prev);
    }

    // Gera narrativa IA
    const periodLabel = `${new Date(periodStart).toLocaleDateString('pt-BR')} a ${new Date(periodEnd).toLocaleDateString('pt-BR')}`;
    const narrative = await generateNarrative(client.name, current, previous, periodLabel);

    // Upsert na tabela
    const reportData = {
      current,
      previous,
      deltas: {
        conversations: pctDelta(current.conversations, previous.conversations),
        cost_per_conversation: pctDelta(current.cost_per_conversation, previous.cost_per_conversation),
        spend: pctDelta(current.spend, previous.spend),
        reach: pctDelta(current.reach, previous.reach),
        impressions: pctDelta(current.impressions, previous.impressions),
      },
      client_name: client.name,
      ad_account_id: adAccountId,
      monthly_budget: client.ad_monthly_budget,
    };

    const { data: report, error: upsertErr } = await supabase
      .from('matcon_reports')
      .upsert({
        client_id,
        ad_account_id: adAccountId,
        period_type,
        period_start: periodStart,
        period_end: periodEnd,
        report_data: reportData,
        narrative: { summary: narrative.summary, highlights: narrative.highlights },
        next_steps: narrative.next_steps,
        status: 'generated',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'client_id,period_start,period_end,period_type' })
      .select()
      .single();

    if (upsertErr) {
      console.error('[generate-matcon-report] upsert:', upsertErr);
      return new Response(JSON.stringify({ error: upsertErr.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, report }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-matcon-report] Fatal:', error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
