// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const MODEL = "claude-sonnet-4-5-20250929";
const PROMPT_VERSION = "v1";

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

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      return json(
        {
          error:
            "ANTHROPIC_API_KEY não configurada nas secrets do Supabase. Configure via Dashboard → Edge Functions → Secrets.",
        },
        500
      );
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

    // 3. Montar contexto do candidato
    const candidateInfo = `
NOME: ${app.candidate.full_name}
EMAIL: ${app.candidate.email}
TELEFONE: ${app.candidate.phone || "não informado"}
CIDADE: ${app.candidate.city || ""}${
      app.candidate.state ? " - " + app.candidate.state : ""
    }
LINKEDIN: ${app.candidate.linkedin_url || "não informado"}
PORTFÓLIO: ${app.candidate.portfolio_url || "não informado"}
`.trim();

    const responsesText = (responses || [])
      .map((r: any) => {
        const value = typeof r.value === "string" ? r.value : JSON.stringify(r.value);
        return `• ${r.label}\n  ${value}`;
      })
      .join("\n\n");

    // 4. Montar contexto da função/vaga
    const snap = app.job.snapshot_profile || {};
    const jobInfo = `
TÍTULO DA VAGA: ${app.job.title}
DEPARTAMENTO: ${snap.department || "—"}
SENIORIDADE: ${snap.seniority || "—"}
MODALIDADE: ${snap.modality || "—"}

MISSÃO DA FUNÇÃO:
${snap.mission || "Não informada"}

ENTREGÁVEIS ESPERADOS:
${(snap.deliverables || []).map((d: string) => `• ${d}`).join("\n") || "Não informados"}

SKILLS NECESSÁRIAS:
${
  (snap.skills || [])
    .map((s: any) => `• ${s.name}${s.level ? " (" + s.level + ")" : ""}${s.required ? " [OBRIGATÓRIO]" : ""}`)
    .join("\n") || "Não informadas"
}

FERRAMENTAS:
${(snap.tools || []).map((t: any) => `• ${t.name}`).join("\n") || "Não informadas"}

REQUISITOS:
${(snap.requirements || []).map((r: string) => `• ${r}`).join("\n") || "Não informados"}
`.trim();

    // 5. System prompt
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

    // 6. Chamar Claude
    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("[rh-analyze] Anthropic error:", errText);
      return json({ error: "Erro na API Anthropic", details: errText }, 500);
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content
      ?.map((b: any) => b.text || "")
      .join("")
      .trim();

    if (!rawText) {
      return json({ error: "Resposta vazia da IA" }, 500);
    }

    // Tenta parsear JSON (às vezes vem com markdown fences)
    let analysis: AnalysisResult;
    try {
      const cleaned = rawText
        .replace(/^```json\s*/, "")
        .replace(/^```\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
      analysis = JSON.parse(cleaned);
    } catch (e) {
      console.error("[rh-analyze] JSON parse error:", rawText);
      return json(
        {
          error: "IA retornou formato inválido",
          raw: rawText.slice(0, 500),
        },
        500
      );
    }

    // 7. Salvar análise
    const { data: savedAnalysis, error: saveErr } = await supabase
      .from("hr_ai_analyses")
      .insert({
        application_id,
        provider: "anthropic",
        model: MODEL,
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
        tokens_input: anthropicData.usage?.input_tokens || null,
        tokens_output: anthropicData.usage?.output_tokens || null,
      })
      .select()
      .single();

    if (saveErr) {
      console.error("[rh-analyze] Save error:", saveErr);
      return json({ error: "Erro ao salvar análise", details: saveErr.message }, 500);
    }

    // 8. Atualizar application com score cached
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
      description: `Análise IA executada — score ${Math.round(analysis.score_overall)}`,
      metadata: { analysis_id: savedAnalysis.id },
    });

    return json({ success: true, analysis: savedAnalysis });
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
