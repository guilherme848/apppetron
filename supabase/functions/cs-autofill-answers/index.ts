import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface QuestionInput {
  id: string;
  answer_key: string | null;
  question_text: string;
  field_type: string;
  options_json: { label: string; value: string }[] | null;
  ai_extract_hint: string | null;
}

interface CurrentAnswer {
  question_id: string;
  answer_text: string | null;
  answer_value_json: unknown;
}

interface AIAnswer {
  question_id: string;
  answer_key: string | null;
  value: unknown;
  text: string;
  needs_validation: boolean;
  confidence: number;
}

function detectRefusalLikeText(content: string): boolean {
  const refusalIndicators = [
    "i cannot", "i can't", "i dont have the ability", "i don't have the ability",
    "cannot complete this request", "i'm unable to", "as a language model",
    "my limitations", "i apologize", "não posso", "não consigo", "não tenho como",
  ];
  const lowered = content.toLowerCase();
  return refusalIndicators.some((i) => lowered.includes(i));
}

function coerceMessageContent(message: any): string {
  const c = message?.content;
  if (typeof c === "string") return c;
  if (Array.isArray(c)) {
    return c
      .map((p: any) => {
        if (typeof p === "string") return p;
        if (typeof p?.text === "string") return p.text;
        if (typeof p?.content === "string") return p.content;
        return "";
      })
      .join("")
      .trim();
  }
  return "";
}

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    if (detectRefusalLikeText(cleaned)) {
      throw new Error("IA recusou ou não pôde processar o pedido");
    }
    throw new Error("Nenhum objeto JSON encontrado na resposta da IA");
  }
  cleaned = cleaned.substring(jsonStart, jsonEnd + 1);

  try {
    return JSON.parse(cleaned);
  } catch {
    const repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/[\x00-\x1F\x7F]/g, "");
    try {
      return JSON.parse(repaired);
    } catch (e) {
      if (detectRefusalLikeText(response)) {
        throw new Error("IA recusou ou não pôde processar o pedido");
      }
      throw new Error(
        `Resposta da IA em formato inválido (não foi possível parsear JSON): ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
}

Deno.serve(async (req) => {
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

    const { transcript_text, questions, current_answers } = await req.json();

    if (!transcript_text || !questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "transcript_text and questions are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter only unanswered questions
    const unansweredQuestions = questions.filter((q: QuestionInput) => {
      const currentAnswer = current_answers?.find(
        (a: CurrentAnswer) => a.question_id === q.id
      );
      const hasText = currentAnswer?.answer_text?.trim();
      const hasValue = currentAnswer?.answer_value_json !== null && currentAnswer?.answer_value_json !== undefined;
      return !hasText && !hasValue;
    });

    if (unansweredQuestions.length === 0) {
      return new Response(
        JSON.stringify({ answers: [], message: "Todas as perguntas já estão respondidas" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const questionsForPrompt = unansweredQuestions.map((q: QuestionInput) => ({
      id: q.id,
      answer_key: q.answer_key,
      question_text: q.question_text,
      field_type: q.field_type,
      options: q.options_json,
      hint: q.ai_extract_hint,
    }));

    const systemPrompt = `Você é um analista sênior de Customer Success para agências de marketing.

Sua tarefa é ler a transcrição de uma reunião de onboarding e preencher respostas para um questionário.

Regras:
- Preencha apenas as perguntas fornecidas (todas estão sem resposta).
- Não invente. Se não estiver claro ou não foi mencionado, retorne null e marque needs_validation como true.
- Respeite o tipo do campo:
  - number/money: retornar número
  - single_select/multi_select: usar apenas valores existentes em options (use o campo "value")
  - boolean: true/false
  - short_text/long_text: string
  - date: formato YYYY-MM-DD
  - time: formato HH:MM
  - phone: string com DDD
  - email: string de email válido
- Além da resposta, retorne um confidence (0 a 1).
- Se o hint (dica de extração) estiver presente, use como guia para encontrar a informação.

Formato de saída (JSON):
{
  "answers": [
    {
      "question_id": "...",
      "answer_key": "...",
      "value": <tipado ou null>,
      "text": "<texto legível ou vazio>",
      "needs_validation": true|false,
      "confidence": 0.0-1.0
    }
  ]
}`;

    const userPrompt = `Perguntas a responder:
${JSON.stringify(questionsForPrompt, null, 2)}

Transcrição da reunião:
${transcript_text}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    async function callAiOnce() {
      return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "openai/gpt-5",
          messages: [
            { role: "system", content: systemPrompt + "\n\nResponda APENAS com JSON válido (sem markdown, sem texto extra)." },
            { role: "user", content: userPrompt },
          ],
          max_completion_tokens: 4000,
        }),
      });
    }

    let response = await callAiOnce();

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Falha ao chamar API de IA");
    }

    let aiResult = await response.json();
    const message = aiResult.choices?.[0]?.message;
    
    if (message?.refusal) {
      console.error("AI refused:", message.refusal);
      throw new Error("IA recusou processar o pedido");
    }

    const content = coerceMessageContent(message);

    console.log(
      "AI response structure:",
      JSON.stringify({
        choices_length: aiResult.choices?.length,
        finish_reason: aiResult.choices?.[0]?.finish_reason,
        has_content: !!content,
        content_preview: content ? content.slice(0, 200) : null,
        has_refusal: !!message?.refusal,
        has_tool_calls: Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0,
      })
    );

    if (!content) {
      console.error("Empty AI response. Full result:", JSON.stringify(aiResult));
      console.warn("Retrying AI call once due to empty content...");
      response = await callAiOnce();
      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI API error (retry):", errorText);
        throw new Error("Falha ao chamar API de IA");
      }
      aiResult = await response.json();
      const msg2 = aiResult.choices?.[0]?.message;
      const content2 = coerceMessageContent(msg2);
      if (!content2) {
        console.error("Empty AI response after retry. Full result:", JSON.stringify(aiResult));
        throw new Error("Resposta vazia da IA");
      }
      (aiResult as any).__content_override = content2;
    }

    let parsedResponse: { answers: AIAnswer[] };
    try {
      const effectiveContent = (aiResult as any).__content_override ?? content;
      const extracted = extractJsonFromResponse(effectiveContent);
      parsedResponse = extracted as { answers: AIAnswer[] };
    } catch (e) {
      console.error("Failed to parse AI response. Raw content:", (aiResult as any).__content_override ?? content);
      throw e instanceof Error ? e : new Error("Resposta da IA em formato inválido");
    }

    const validAnswers = (parsedResponse.answers || []).filter(
      (a: AIAnswer) => a.value !== null || a.text
    );

    console.log(`AI autofill: ${validAnswers.length} answers generated from ${unansweredQuestions.length} questions`);

    return new Response(
      JSON.stringify({
        answers: validAnswers,
        total_questions: unansweredQuestions.length,
        filled_count: validAnswers.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in cs-autofill-answers:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
