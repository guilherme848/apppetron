import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { clients } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!clients || !Array.isArray(clients) || clients.length === 0) {
      return new Response(JSON.stringify({ error: "No clients provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clientList = clients
      .map((c: any) => `ID: ${c.id} | Nome: ${c.name} | Nicho: ${c.niche || "Não definido"}`)
      .join("\n");

    const prompt = `Você é um assistente especializado em gestão de tráfego pago para agências de marketing digital.

Distribua os clientes abaixo em 5 dias da semana (1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta) seguindo estas regras:
1. Agrupe clientes do MESMO nicho no mesmo dia sempre que possível
2. Meta máxima: 5 clientes por dia
3. Distribua de forma equilibrada entre os dias
4. Se houver mais de 25 clientes, priorize os que têm nicho definido para agrupar, e distribua os demais nos dias com menos clientes

CLIENTES:
${clientList}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You distribute clients across weekdays for traffic managers. Always respond using the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "distribute_clients",
              description: "Distribute clients across weekdays 1-5",
              parameters: {
                type: "object",
                properties: {
                  distribution: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        client_id: { type: "string", description: "The client UUID" },
                        weekday: { type: "integer", description: "Day of week: 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri" },
                      },
                      required: ["client_id", "weekday"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["distribution"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "distribute_clients" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (toolCall) {
      const args = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(args), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("suggest-weekly-cycle error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
