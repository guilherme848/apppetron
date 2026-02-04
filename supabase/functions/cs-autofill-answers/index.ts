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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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
      // Consider unanswered if no text and no value_json
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

    // Build the prompt
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

    // Call AI via Lovable AI gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_completion_tokens: 4000,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error("Falha ao chamar API de IA");
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Resposta vazia da IA");
    }

    let parsedResponse: { answers: AIAnswer[] };
    try {
      parsedResponse = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Resposta da IA em formato inválido");
    }

    // Filter out null values and validate
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
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
