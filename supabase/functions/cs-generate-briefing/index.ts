import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista sênior em Customer Success para agências de marketing.

Analise a transcrição de uma reunião de fechamento/vendas e gere um Briefing de Onboarding para o time de CS.

Objetivo do briefing:
Preparar o CS para uma reunião de onboarding eficiente, evitando desalinhamentos, churn precoce e frustrações.

Regras:
- Seja direto, prático e orientado à ação.
- Identifique riscos reais, mesmo que sutis.
- Não invente informações que não estejam explícitas ou implícitas.
- Se algo não estiver claro, sinalize como "precisa ser validado".

Gere o briefing com as seguintes seções obrigatórias:
1. Resumo executivo da venda
2. Objetivos e expectativas do cliente
3. Escopo vendido (e riscos de desalinhamento)
4. Pontos de atenção e riscos identificados
5. Checklist do que o CS deve validar no onboarding
6. Frases-chave do cliente (citações relevantes)
7. Análise do perfil comportamental do cliente
8. Score de risco inicial (0–100) com justificativa

Formato:
- Títulos claros
- Bullet points curtos
- Linguagem profissional e objetiva

IMPORTANTE: Retorne a resposta APENAS em JSON válido com a seguinte estrutura exata:
{
  "resumo_executivo": "string",
  "objetivos_expectativas": ["string"],
  "escopo_vendido": {
    "itens": ["string"],
    "riscos_desalinhamento": ["string"]
  },
  "pontos_atencao_riscos": ["string"],
  "checklist_validacao": ["string"],
  "frases_chave": ["string"],
  "perfil_comportamental": "string",
  "risk_score": number,
  "risk_justificativa": "string"
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcript } = await req.json();
    
    if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Transcrição é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (transcript.length < 100) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta. Forneça pelo menos 100 caracteres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Chave da API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling Lovable AI Gateway for briefing generation...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Entrada:\n\n${transcript}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Muitas requisições. Aguarde alguns segundos e tente novamente." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao gerar briefing. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ error: "Resposta da IA vazia" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("AI response received, parsing...");

    // Parse the JSON response
    let briefingContent;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        briefingContent = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      console.error("Raw content:", content);
      return new Response(
        JSON.stringify({ error: "Erro ao processar resposta da IA. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate risk level
    const riskScore = briefingContent.risk_score || 50;
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (riskScore <= 33) riskLevel = 'low';
    else if (riskScore >= 67) riskLevel = 'high';

    console.log("Briefing generated successfully with risk score:", riskScore);

    return new Response(
      JSON.stringify({
        briefing_content: briefingContent,
        risk_score: riskScore,
        risk_level: riskLevel,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cs-generate-briefing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
