import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Provider Configuration ──────────────────────────────────────────
interface ProviderConfig {
  apiUrl: string;
  apiKey: string;
  transformModel?: (model: string) => string;
  transformBody?: (body: any) => any;
  extractContent?: (data: any) => string;
}

function getProviderFromModel(model: string): string {
  if (model.startsWith("anthropic/") || model.startsWith("claude-")) return "anthropic";
  if (model.startsWith("openai/") || model.startsWith("gpt-") || model.startsWith("o1") || model.startsWith("o3") || model.startsWith("o4")) return "openai";
  if (model.startsWith("google/") || model.startsWith("gemini-")) return "google";
  if (model.startsWith("meta-llama/") || model.startsWith("deepseek/") || model.startsWith("mistralai/")) return "openrouter";
  // Default: try OpenRouter which supports most models
  return "openrouter";
}

function stripPrefix(model: string): string {
  return model.replace(/^(anthropic|openai|google|meta-llama|deepseek|mistralai)\//, "");
}

function getProviderConfig(provider: string): ProviderConfig {
  switch (provider) {
    case "anthropic": {
      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
      return {
        apiUrl: "https://api.anthropic.com/v1/messages",
        apiKey,
        transformBody: (body: any) => ({
          model: stripPrefix(body.model),
          max_tokens: body.max_tokens || 4096,
          system: body.messages[0]?.role === "system" ? body.messages[0].content : undefined,
          messages: body.messages.filter((m: any) => m.role !== "system"),
        }),
        extractContent: (data: any) => {
          if (data.content && Array.isArray(data.content)) {
            return data.content.map((block: any) => block.text || "").join("");
          }
          return data.content || "";
        },
      };
    }

    case "openai": {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) throw new Error("OPENAI_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
      return {
        apiUrl: "https://api.openai.com/v1/chat/completions",
        apiKey,
        transformModel: (model: string) => stripPrefix(model),
      };
    }

    case "google": {
      const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
      if (!apiKey) throw new Error("GOOGLE_AI_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
      return {
        apiUrl: `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${apiKey}`,
        apiKey,
        transformModel: (model: string) => stripPrefix(model),
      };
    }

    case "openrouter":
    default: {
      const apiKey = Deno.env.get("OPENROUTER_API_KEY") || Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) throw new Error("OPENROUTER_API_KEY não configurada. Adicione nas variáveis de ambiente do Supabase.");
      return {
        apiUrl: "https://openrouter.ai/api/v1/chat/completions",
        apiKey,
      };
    }
  }
}

// ── Main Handler ────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader || "" } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { prompt, system_prompt, model, max_tokens, messages, stream } = body;

    // Determine provider from model name
    const modelName = model || "google/gemini-2.5-flash";
    const provider = getProviderFromModel(modelName);
    const config = getProviderConfig(provider);

    // Build messages array
    const aiMessages = messages
      ? [{ role: "system", content: system_prompt || "Você é um assistente especialista em marketing e comunicação para o segmento de material de construção." }, ...messages]
      : [
          { role: "system", content: system_prompt || "Você é um assistente especialista em marketing e comunicação para o segmento de material de construção." },
          { role: "user", content: prompt },
        ];

    // Build request body
    let aiBody: any = {
      model: config.transformModel ? config.transformModel(modelName) : modelName,
      messages: aiMessages,
      max_tokens: max_tokens || 4096,
    };

    // Provider-specific body transformation (e.g., Anthropic uses different format)
    if (config.transformBody) {
      aiBody = config.transformBody(aiBody);
    }

    if (stream && provider !== "anthropic") {
      aiBody.stream = true;
    }

    // Build headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (provider === "anthropic") {
      headers["x-api-key"] = config.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (provider === "google") {
      // Google AI Studio uses API key as query param (already in URL)
    } else {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    // Add OpenRouter specific headers
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = "https://petron.app";
      headers["X-Title"] = "Petron OS";
    }

    console.log(`[petron-os-generate] provider=${provider} model=${modelName} user=${user.id}`);

    // Make request
    const response = await fetch(config.apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(aiBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[${provider}] API error:`, response.status, errorText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402 || response.status === 403) {
        return new Response(JSON.stringify({ error: `Erro de autenticação/créditos no provider ${provider}. Verifique a API key.` }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`${provider} API error: ${response.status} - ${errorText.slice(0, 200)}`);
    }

    // Stream response
    if (stream && provider !== "anthropic") {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Parse response
    const aiData = await response.json();
    let content = "";

    if (config.extractContent) {
      content = config.extractContent(aiData);
    } else {
      content = aiData.choices?.[0]?.message?.content || "";
    }

    return new Response(JSON.stringify({ content, provider, model: modelName }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("petron-os-generate error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
