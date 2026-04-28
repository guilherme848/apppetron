// ═══════════════════════════════════════════════════════════════════════════
// transcribe-webhook
// ───────────────────────────────────────────────────────────────────────────
// Endpoint público (verify_jwt=false) chamado pelo AssemblyAI quando o
// processamento termina (sucesso ou falha).
//
// Headers que esperamos do AssemblyAI:
//   x-transcription-id: UUID da nossa transcription (setado em transcribe-start
//                       via webhook_auth_header_value)
//
// Body recebido (resumido):
//   { transcript_id: "abc...", status: "completed" | "error", error?: "..." }
//
// Quando status = completed → fazemos GET /v2/transcript/{id} pra puxar
// utterances, summary, chapters, etc.
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-transcription-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";

interface WebhookBody {
  transcript_id?: string;
  status?: "completed" | "error";
  error?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as WebhookBody;
    const transcriptionId = req.headers.get("x-transcription-id");

    console.log("[transcribe-webhook] recebido", {
      transcriptionId,
      assemblyId: body.transcript_id,
      status: body.status,
    });

    if (!transcriptionId || !body.transcript_id) {
      return jsonError("Headers/body inválidos", 400);
    }

    const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
    if (!apiKey) return jsonError("ASSEMBLYAI_API_KEY ausente", 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Caso de erro
    if (body.status === "error") {
      await admin
        .from("transcriptions")
        .update({
          status: "failed",
          error_message: body.error || "AssemblyAI reportou erro sem detalhes",
        })
        .eq("id", transcriptionId);

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Caso completo: buscar dados detalhados
    const detailRes = await fetch(`${ASSEMBLYAI_BASE}/transcript/${body.transcript_id}`, {
      headers: { authorization: apiKey },
    });

    if (!detailRes.ok) {
      const errBody = await detailRes.text();
      await admin
        .from("transcriptions")
        .update({
          status: "failed",
          error_message: `Falha GET transcript: ${detailRes.status} ${errBody.slice(0, 300)}`,
        })
        .eq("id", transcriptionId);
      return jsonError(`AssemblyAI GET ${detailRes.status}`, 502);
    }

    const detail = await detailRes.json();

    // Speakers únicos
    const speakers: string[] = Array.from(
      new Set(
        ((detail.utterances ?? []) as Array<{ speaker?: string }>)
          .map((u) => u.speaker)
          .filter(Boolean) as string[],
      ),
    );

    // Custo estimado (US$ 0.37/h ≈ R$ 1.85/h em câmbio 5.0; armazenamos em cents BRL)
    const durationMs = detail.audio_duration ? detail.audio_duration * 1000 : 0;
    const durationHours = durationMs / 1000 / 3600;
    const costBrlCents = Math.round(durationHours * 1.85 * 100);

    const updatePayload = {
      status: "completed" as const,
      transcript_text: detail.text ?? null,
      utterances: detail.utterances ?? null,
      summary: detail.summary ?? null,
      chapters: detail.chapters ?? null,
      entities: detail.entities ?? null,
      highlights: detail.auto_highlights_result?.results ?? null,
      speakers: speakers.length > 0 ? speakers : null,
      duration_seconds: detail.audio_duration ?? null,
      cost_cents: costBrlCents > 0 ? costBrlCents : null,
      raw_response: detail,
      completed_at: new Date().toISOString(),
      error_message: null,
    };

    const { error: updErr } = await admin
      .from("transcriptions")
      .update(updatePayload)
      .eq("id", transcriptionId);

    if (updErr) {
      console.error("[transcribe-webhook] erro update:", updErr);
      return jsonError(`Erro update DB: ${updErr.message}`, 500);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[transcribe-webhook] erro inesperado", e);
    return jsonError(`Erro: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
});

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
