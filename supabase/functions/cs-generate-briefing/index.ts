import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é um especialista sênior em Customer Success para agências de marketing.

CONTEXTO IMPORTANTE: Esta é uma transcrição de uma reunião de vendas de um cliente que JÁ ESTÁ CADASTRADO no sistema.
A venda já foi concretizada e o cliente está ativo na agência. NÃO tente inferir se houve fechamento ou não.

Objetivo do briefing:
Preparar o CS para uma reunião de onboarding eficiente, evitando desalinhamentos, churn precoce e frustrações.

Regras:
- Seja direto, prático e orientado à ação.
- A venda é SEMPRE considerada fechada, pois o cliente já está no sistema.
- Identifique riscos de OPERAÇÃO e EXPECTATIVAS, não de fechamento.
- Não invente informações que não estejam explícitas ou implícitas.
- Se algo não estiver claro, sinalize como "precisa ser validado no onboarding".
- Foque em extrair: contexto, expectativas, riscos operacionais e alinhamentos.

Gere o briefing com as seguintes seções obrigatórias:
1. Resumo executivo do cliente e contexto da venda
2. Objetivos e expectativas do cliente
3. Escopo vendido (e riscos de desalinhamento operacional)
4. Pontos de atenção e riscos operacionais identificados
5. Checklist do que o CS deve validar no onboarding
6. Frases-chave do cliente (citações relevantes)
7. Análise do perfil comportamental do cliente
8. Score de risco operacional (0–100) com justificativa

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
    // --- Authentication check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End authentication check ---

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

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Chave da OpenAI não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Calling OpenAI API for briefing generation...");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
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

    let briefingContent;
    try {
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
      JSON.stringify({ error: "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
