import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clienteId, quantidade, formatos, mesReferencia } = await req.json();
    if (!clienteId || !quantidade || !formatos || !mesReferencia) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Fetch client data
    const { data: account } = await sb.from("accounts").select("name, niche, city, state, midias_ativas").eq("id", clienteId).single();

    // Fetch intelligence
    const { data: intel } = await sb.from("inteligencia_cliente").select("*").eq("cliente_id", clienteId).maybeSingle();

    // Fetch concorrentes
    const { data: concorrentes } = await sb.from("cliente_concorrentes").select("nome, instagram_url, site_url, observacoes").eq("cliente_id", clienteId);

    // Fetch ações comerciais
    const { data: acoes } = await sb.from("historico_acoes_comerciais").select("produto, tipo_acao, descricao, periodo, performou_bem, observacao").eq("cliente_id", clienteId);

    // Build context sections dynamically
    const sections: string[] = [];

    sections.push(`DADOS DA EMPRESA:
- Nome: ${account?.name || "N/A"}
- Segmento: ${account?.niche || "Não informado"}
- Cidade/Região: ${[account?.city, account?.state].filter(Boolean).join(", ") || "Não informado"}
- Mídias ativas: ${account?.midias_ativas?.join(", ") || "Não informado"}`);

    if (intel) {
      const icpParts = [
        intel.icp_descricao && `- Descrição: ${intel.icp_descricao}`,
        intel.icp_perfil_comprador && `- Perfil do comprador: ${intel.icp_perfil_comprador}`,
        intel.icp_comportamento && `- Comportamento de compra: ${intel.icp_comportamento}`,
        intel.icp_ticket_medio && `- Ticket médio: ${intel.icp_ticket_medio}`,
      ].filter(Boolean);
      if (icpParts.length) sections.push(`ICP — CLIENTE IDEAL:\n${icpParts.join("\n")}`);

      const prodParts = [
        intel.produtos_especialidades?.length && `- Especialidades: ${intel.produtos_especialidades.join(", ")}`,
        intel.produtos_marcas && `- Marcas: ${intel.produtos_marcas}`,
        intel.produtos_carro_chefe && `- Carro-chefe: ${intel.produtos_carro_chefe}`,
        intel.produtos_mix_resumo && `- Mix: ${intel.produtos_mix_resumo}`,
      ].filter(Boolean);
      if (prodParts.length) sections.push(`PRODUTOS E SERVIÇOS:\n${prodParts.join("\n")}`);

      const idParts = [
        intel.diferencial && `- Diferencial: ${intel.diferencial}`,
        intel.posicionamento && `- Posicionamento: ${intel.posicionamento}`,
        intel.tom_de_voz && `- Tom de voz: ${intel.tom_de_voz}`,
        intel.o_que_funciona && `- O que funciona em conteúdo: ${intel.o_que_funciona}`,
        intel.o_que_nao_funciona && `- O que NÃO funciona: ${intel.o_que_nao_funciona}`,
        intel.referencias_visuais && `- Referências visuais: ${intel.referencias_visuais}`,
      ].filter(Boolean);
      if (idParts.length) sections.push(`IDENTIDADE E COMUNICAÇÃO:\n${idParts.join("\n")}`);
    }

    if (concorrentes?.length) {
      const concList = concorrentes.map((c: any) => `- ${c.nome}${c.observacoes ? `: ${c.observacoes}` : ""}`).join("\n");
      sections.push(`CONCORRENTES CADASTRADOS:\n${concList}`);
    }

    const acoesOk = acoes?.filter((a: any) => a.performou_bem === true);
    const acoesNok = acoes?.filter((a: any) => a.performou_bem === false);
    if (acoesOk?.length) {
      sections.push(`AÇÕES QUE FUNCIONARAM:\n${acoesOk.map((a: any) => `- ${a.produto}: ${a.descricao || a.tipo_acao || ""}`).join("\n")}`);
    }
    if (acoesNok?.length) {
      sections.push(`AÇÕES QUE NÃO FUNCIONARAM:\n${acoesNok.map((a: any) => `- ${a.produto}: ${a.descricao || a.tipo_acao || ""}`).join("\n")}`);
    }

    // Format distribution
    const formatDist = Object.entries(formatos as Record<string, number>)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${v} ${k}`)
      .join(", ");

    const systemPrompt = `Você é um estrategista de conteúdo para redes sociais. Seu papel é sugerir conteúdos baseados no perfil específico de cada empresa.

${sections.join("\n\n")}

REGRAS PARA GERAÇÃO:
- Gerar exatamente ${quantidade} sugestões
- Distribuição: ${formatDist}
- Mês de referência: ${mesReferencia}
${intel?.tom_de_voz ? `- Tom de voz obrigatório: ${intel.tom_de_voz}` : ""}
${intel?.o_que_nao_funciona ? `- EVITAR: ${intel.o_que_nao_funciona}` : ""}
${intel?.o_que_funciona ? `- PRIORIZAR: ${intel.o_que_funciona}` : ""}
- Cada sugestão deve ser relevante para o segmento e o público do cliente
- Pensar em conteúdos que gerem engajamento e demanda`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Gere ${quantidade} sugestões de conteúdo para ${account?.name || "o cliente"}.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_content",
              description: "Return content suggestions as structured data",
              parameters: {
                type: "object",
                properties: {
                  sugestoes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        titulo: { type: "string", description: "Título da pauta" },
                        formato: { type: "string", enum: ["post", "video", "carrossel", "reels"], description: "Formato do conteúdo" },
                        legenda: { type: "string", description: "Texto completo sugerido para legenda" },
                        briefing: { type: "string", description: "Briefing para o designer ou videomaker executar" },
                        justificativa: { type: "string", description: "Por que esse conteúdo faz sentido" },
                      },
                      required: ["titulo", "formato", "legenda", "briefing", "justificativa"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["sugestoes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_content" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const text = await aiResponse.text();
      console.error("AI gateway error:", status, text);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar sugestões" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-content error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
