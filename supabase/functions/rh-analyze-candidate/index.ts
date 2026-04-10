// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const PROMPT_VERSION = "v1";

// ─── Provider Configuration ──────────────────────────────────────
// Ordem de preferência: Anthropic → OpenAI → Google Gemini
// O primeiro provider com API key configurada é usado.

type Provider = "anthropic" | "openai" | "google";

interface ProviderResult {
  provider: Provider;
  model: string;
  content: string;
  tokens_input?: number;
  tokens_output?: number;
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const model = "claude-sonnet-4-5-20250929";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic error: ${errText}`);
  }

  const data = await res.json();
  const content = (data.content || [])
    .map((b: any) => b.text || "")
    .join("")
    .trim();
  return {
    provider: "anthropic",
    model,
    content,
    tokens_input: data.usage?.input_tokens,
    tokens_output: data.usage?.output_tokens,
  };
}

async function callOpenAI(
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult | null> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const model = "gpt-4o-mini";
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error: ${errText}`);
  }

  const data = await res.json();
  return {
    provider: "openai",
    model,
    content: data.choices?.[0]?.message?.content || "",
    tokens_input: data.usage?.prompt_tokens,
    tokens_output: data.usage?.completion_tokens,
  };
}

async function callGoogle(
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult | null> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return null;

  const model = "gemini-2.0-flash-exp";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json",
          maxOutputTokens: 2000,
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google error: ${errText}`);
  }

  const data = await res.json();
  const content = (data.candidates?.[0]?.content?.parts || [])
    .map((p: any) => p.text || "")
    .join("");
  return {
    provider: "google",
    model,
    content,
    tokens_input: data.usageMetadata?.promptTokenCount,
    tokens_output: data.usageMetadata?.candidatesTokenCount,
  };
}

async function callLlm(
  systemPrompt: string,
  userPrompt: string
): Promise<ProviderResult> {
  const providers: Array<() => Promise<ProviderResult | null>> = [
    () => callAnthropic(systemPrompt, userPrompt),
    () => callOpenAI(systemPrompt, userPrompt),
    () => callGoogle(systemPrompt, userPrompt),
  ];

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      const result = await provider();
      if (result && result.content) return result;
    } catch (e: any) {
      errors.push(e.message || String(e));
      console.warn("[rh-analyze] provider failed:", e.message);
      continue;
    }
  }

  throw new Error(
    `Nenhum provider LLM respondeu. Configure ANTHROPIC_API_KEY, OPENAI_API_KEY ou GOOGLE_AI_API_KEY nas secrets do Supabase. Erros: ${errors.join(
      " | "
    )}`
  );
}

// ─── Main handler ────────────────────────────────────────────────

interface AnalysisResult {
  score_overall: number;
  score_skills: number;
  score_experience: number;
  score_culture: number;
  strengths: string[];
  gaps: string[];
  red_flags: string[];
  highlights: string[];
  recommendation: "strong_advance" | "advance" | "hold" | "reject";
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { application_id } = await req.json();
    if (!application_id) {
      return json({ error: "application_id é obrigatório" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Buscar dados da application
    const { data: app, error: appErr } = await supabase
      .from("hr_applications")
      .select("*, candidate:hr_candidates(*), job:hr_jobs(*)")
      .eq("id", application_id)
      .single();

    if (appErr || !app) {
      return json({ error: "Inscrição não encontrada" }, 404);
    }

    // 2. Buscar respostas
    const { data: responses } = await supabase
      .from("hr_form_responses")
      .select("*")
      .eq("application_id", application_id)
      .order("created_at");

    // 3. Montar contexto
    const candidate = (app as any).candidate;
    const job = (app as any).job;
    const snap = job?.snapshot_profile || {};

    const candidateInfo = `
NOME: ${candidate.full_name}
EMAIL: ${candidate.email}
TELEFONE: ${candidate.phone || "não informado"}
CIDADE: ${candidate.city || ""}${candidate.state ? " - " + candidate.state : ""}
LINKEDIN: ${candidate.linkedin_url || "não informado"}
PORTFÓLIO: ${candidate.portfolio_url || "não informado"}
`.trim();

    const responsesText = (responses || [])
      .map((r: any) => {
        const value = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
        return `• ${r.label}\n  ${value}`;
      })
      .join("\n\n");

    const jobInfo = `
TÍTULO DA VAGA: ${job.title}
DEPARTAMENTO: ${snap.department || "—"}
SENIORIDADE: ${snap.seniority || "—"}
MODALIDADE: ${snap.modality || "—"}

MISSÃO DA FUNÇÃO:
${snap.mission || "Não informada"}

ENTREGÁVEIS ESPERADOS:
${
  (snap.deliverables || []).length
    ? (snap.deliverables || []).map((d: string) => `• ${d}`).join("\n")
    : "Não informados"
}

SKILLS NECESSÁRIAS:
${
  (snap.skills || []).length
    ? (snap.skills || [])
        .map(
          (s: any) =>
            `• ${s.name}${s.level ? " (" + s.level + ")" : ""}${s.required ? " [OBRIGATÓRIO]" : ""}`
        )
        .join("\n")
    : "Não informadas"
}

FERRAMENTAS:
${
  (snap.tools || []).length
    ? (snap.tools || []).map((t: any) => `• ${t.name}`).join("\n")
    : "Não informadas"
}

REQUISITOS:
${
  (snap.requirements || []).length
    ? (snap.requirements || []).map((r: string) => `• ${r}`).join("\n")
    : "Não informados"
}
`.trim();

    // 4. Prompts
    const systemPrompt = `Você é um recrutador sênior especialista em análise de candidatos para agências de marketing digital brasileiras (especialmente o setor de materiais de construção / MatCon).

Sua tarefa é analisar objetivamente um candidato em relação ao perfil da função desejada, identificando pontos fortes, gaps e red flags.

REGRAS OBRIGATÓRIAS:
1. Seja factual e direto — não invente informações que não estão nas respostas ou currículo
2. Dê um score de 0 a 100 considerando a aderência geral ao perfil
3. Identifique 3-5 pontos fortes concretos (baseados em evidências das respostas)
4. Identifique 2-4 gaps (o que falta ou é incerto)
5. Liste red flags apenas se houver algo genuinamente preocupante (incoerências, lacunas injustificadas, desalinhamento cultural claro)
6. Recomende uma ação final
7. Respeite o contexto brasileiro e considere que experiência em agência MatCon é um diferencial relevante

FORMATO DE SAÍDA: retorne EXCLUSIVAMENTE um JSON válido (sem markdown, sem comentários, sem texto extra) com a estrutura exata:

{
  "score_overall": <0-100>,
  "score_skills": <0-100>,
  "score_experience": <0-100>,
  "score_culture": <0-100>,
  "strengths": ["ponto 1", "ponto 2", ...],
  "gaps": ["gap 1", "gap 2", ...],
  "red_flags": ["flag 1", ...] ou [],
  "highlights": ["destaque 1", ...] ou [],
  "recommendation": "strong_advance" | "advance" | "hold" | "reject",
  "summary": "Resumo executivo de 2-3 frases sobre o candidato e a recomendação"
}`;

    const userPrompt = `## PERFIL DA FUNÇÃO DESEJADA

${jobInfo}

---

## DADOS DO CANDIDATO

${candidateInfo}

${
  app.resume_url
    ? `\n**Currículo anexado:** sim (arquivo: ${app.resume_filename})\n`
    : "\n**Currículo anexado:** não\n"
}

## RESPOSTAS DO FORMULÁRIO

${responsesText || "Nenhuma resposta disponível"}

---

Analise agora e retorne apenas o JSON conforme especificado.`;

    // 5. Chamar LLM com fallback
    const llmResult = await callLlm(systemPrompt, userPrompt);

    // 6. Parsear JSON
    let analysis: AnalysisResult;
    try {
      const cleaned = llmResult.content
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error("[rh-analyze] JSON parse error:", llmResult.content);
      return json(
        {
          error: "IA retornou formato inválido",
          raw: llmResult.content.slice(0, 500),
          provider: llmResult.provider,
        },
        500
      );
    }

    // 7. Salvar análise
    const { data: savedAnalysis, error: saveErr } = await supabase
      .from("hr_ai_analyses")
      .insert({
        application_id,
        provider: llmResult.provider,
        model: llmResult.model,
        prompt_version: PROMPT_VERSION,
        score_overall: Math.round(analysis.score_overall),
        score_skills: Math.round(analysis.score_skills || 0),
        score_experience: Math.round(analysis.score_experience || 0),
        score_culture: Math.round(analysis.score_culture || 0),
        strengths: analysis.strengths || [],
        gaps: analysis.gaps || [],
        red_flags: analysis.red_flags || [],
        highlights: analysis.highlights || [],
        recommendation: analysis.recommendation,
        summary: analysis.summary || null,
        full_response: analysis as any,
        tokens_input: llmResult.tokens_input || null,
        tokens_output: llmResult.tokens_output || null,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[rh-analyze] Save error:", saveErr);
      return json({ error: "Erro ao salvar análise", details: saveErr.message }, 500);
    }

    // 8. Atualizar application
    await supabase
      .from("hr_applications")
      .update({
        ai_score: Math.round(analysis.score_overall),
        ai_recommendation: analysis.recommendation,
        ai_analyzed_at: new Date().toISOString(),
      })
      .eq("id", application_id);

    // 9. Registrar evento
    await supabase.from("hr_application_events").insert({
      application_id,
      event_type: "ai_analyzed",
      description: `Análise IA executada (${llmResult.provider}) — score ${Math.round(
        analysis.score_overall
      )}`,
      metadata: { analysis_id: savedAnalysis.id, provider: llmResult.provider },
    });

    return json({ success: true, analysis: savedAnalysis, provider: llmResult.provider });
  } catch (error: any) {
    console.error("[rh-analyze] Uncaught error:", error);
    return json({ error: error.message || "Erro inesperado" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
