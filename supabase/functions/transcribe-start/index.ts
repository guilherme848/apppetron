// ═══════════════════════════════════════════════════════════════════════════
// transcribe-start (estratégia híbrida)
// ───────────────────────────────────────────────────────────────────────────
// Roteamento automático por tamanho do arquivo:
//
//   < 22 MB  → Groq Whisper Large V3 (síncrono, US$ 0.04/h, sem diarização)
//   >= 22 MB → AssemblyAI Universal-2 (async via webhook, US$ 0.37/h, completo)
//
// Pq 22 MB e não 25? Margem pra overhead de multipart + sslv content-length
// flutuar. Groq oficialmente aceita 25 MB; ficar abaixo evita 413.
//
// Fluxo Groq:
//   1. Gera signed URL
//   2. Faz fetch do arquivo (cabe em memória do edge function)
//   3. POST multipart pra Groq /audio/transcriptions
//   4. Converte segments → utterances (sem speaker, usa "S" único)
//   5. Salva tudo na row (status=completed)
//
// Fluxo AssemblyAI: igual a antes (assíncrono via webhook)
// ═══════════════════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const GROQ_MAX_BYTES = 22 * 1024 * 1024; // 22 MB (margem de segurança contra o limite de 25 MB)
const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const BUCKET = "transcription-videos";

interface StartRequest {
  transcription_id: string;
  /**
   * Override opcional para forçar um provider específico.
   * Útil pra debug ou pra usar AssemblyAI mesmo em arquivo pequeno (ex: precisa diarização).
   */
  force_provider?: "groq" | "assemblyai";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { transcription_id, force_provider } = (await req.json()) as StartRequest;
    if (!transcription_id) {
      return jsonError("transcription_id obrigatório", 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // 1. Carregar row
    const { data: tx, error: txErr } = await admin
      .from("transcriptions")
      .select("id, video_path, video_size_bytes, status, language_code, title")
      .eq("id", transcription_id)
      .maybeSingle();

    if (txErr) return jsonError(`Erro ao ler transcription: ${txErr.message}`, 500);
    if (!tx) return jsonError("Transcription não encontrada", 404);

    // 2. Decisão de provider
    const sizeBytes = tx.video_size_bytes ?? 0;
    const provider: "groq" | "assemblyai" =
      force_provider ??
      (sizeBytes > 0 && sizeBytes < GROQ_MAX_BYTES ? "groq" : "assemblyai");

    console.log("[transcribe-start] roteamento", {
      transcription_id,
      size_mb: (sizeBytes / 1024 / 1024).toFixed(2),
      provider,
      forced: !!force_provider,
    });

    // 3. Signed URL (usado em ambos providers)
    const { data: signed, error: signErr } = await admin.storage
      .from(BUCKET)
      .createSignedUrl(tx.video_path, SIGNED_URL_TTL_SECONDS);

    if (signErr || !signed?.signedUrl) {
      await admin
        .from("transcriptions")
        .update({
          status: "failed",
          provider,
          error_message: `Falha ao gerar signed URL: ${signErr?.message ?? "desconhecido"}`,
        })
        .eq("id", transcription_id);
      return jsonError(`Falha signed URL: ${signErr?.message}`, 500);
    }

    // 4. Marcar como processing imediatamente
    await admin
      .from("transcriptions")
      .update({ status: "processing", provider, error_message: null })
      .eq("id", transcription_id);

    // 5. Roteamento
    if (provider === "groq") {
      return await handleGroq(admin, transcription_id, signed.signedUrl, tx.language_code || "pt");
    }
    return await handleAssemblyAI(
      admin,
      transcription_id,
      signed.signedUrl,
      tx.language_code || "pt",
      supabaseUrl,
    );
  } catch (e) {
    console.error("[transcribe-start] erro inesperado", e);
    return jsonError(`Erro inesperado: ${e instanceof Error ? e.message : String(e)}`, 500);
  }
});

// ─── Handler: Groq Whisper (síncrono) ────────────────────────────────────
async function handleGroq(
  admin: ReturnType<typeof createClient>,
  transcriptionId: string,
  signedUrl: string,
  languageCode: string,
): Promise<Response> {
  const apiKey = Deno.env.get("GROQ_API_KEY");
  if (!apiKey) {
    await admin
      .from("transcriptions")
      .update({ status: "failed", error_message: "GROQ_API_KEY não configurada" })
      .eq("id", transcriptionId);
    return jsonError("GROQ_API_KEY não configurada", 500);
  }

  try {
    // Baixar arquivo
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) {
      throw new Error(`Falha ao baixar do storage: ${fileRes.status}`);
    }
    const fileBlob = await fileRes.blob();
    const filename = signedUrl.split("?")[0].split("/").pop() || "audio.mp3";

    // Montar multipart
    const formData = new FormData();
    formData.append("file", fileBlob, filename);
    formData.append("model", "whisper-large-v3");
    formData.append("language", languageCode);
    formData.append("response_format", "verbose_json");
    formData.append("temperature", "0");

    // Enviar pra Groq
    const groqRes = await fetch(`${GROQ_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      throw new Error(`Groq retornou ${groqRes.status}: ${errBody.slice(0, 500)}`);
    }

    const result = await groqRes.json();
    // Estrutura Groq Whisper:
    //   { text, segments: [{start, end, text, ...}], language, duration }

    const segments: Array<{ start: number; end: number; text: string }> =
      result.segments ?? [];

    // Converter segments (segundos) → utterances (ms) — sem speaker (Whisper não diariza)
    const utterances = segments.map((seg) => ({
      speaker: "S",
      start: Math.round(seg.start * 1000),
      end: Math.round(seg.end * 1000),
      text: seg.text.trim(),
      confidence: undefined,
    }));

    const durationSec = result.duration ?? null;

    // Custo: US$ 0.04/h ≈ R$ 0.20/h (câmbio 5.0)
    const durationHours = durationSec ? durationSec / 3600 : 0;
    const costBrlCents = Math.round(durationHours * 0.2 * 100);

    const updatePayload = {
      status: "completed" as const,
      transcript_text: (result.text ?? "").trim() || null,
      utterances: utterances.length > 0 ? utterances : null,
      speakers: utterances.length > 0 ? ["S"] : null,
      duration_seconds: durationSec,
      cost_cents: costBrlCents > 0 ? costBrlCents : null,
      raw_response: result,
      completed_at: new Date().toISOString(),
      error_message: null,
      // Groq não retorna esses — deixar null
      summary: null,
      chapters: null,
      entities: null,
      highlights: null,
    };

    const { error: updErr } = await admin
      .from("transcriptions")
      .update(updatePayload)
      .eq("id", transcriptionId);

    if (updErr) throw new Error(`Erro update DB: ${updErr.message}`);

    return new Response(
      JSON.stringify({
        ok: true,
        transcription_id: transcriptionId,
        provider: "groq",
        status: "completed",
        duration_seconds: durationSec,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[transcribe-start/groq] falhou:", msg);
    await admin
      .from("transcriptions")
      .update({ status: "failed", error_message: msg })
      .eq("id", transcriptionId);
    return jsonError(`Groq falhou: ${msg}`, 502);
  }
}

// ─── Handler: AssemblyAI (assíncrono via webhook) ────────────────────────
async function handleAssemblyAI(
  admin: ReturnType<typeof createClient>,
  transcriptionId: string,
  signedUrl: string,
  languageCode: string,
  supabaseUrl: string,
): Promise<Response> {
  const apiKey = Deno.env.get("ASSEMBLYAI_API_KEY");
  if (!apiKey) {
    await admin
      .from("transcriptions")
      .update({ status: "failed", error_message: "ASSEMBLYAI_API_KEY não configurada" })
      .eq("id", transcriptionId);
    return jsonError("ASSEMBLYAI_API_KEY não configurada", 500);
  }

  const webhookUrl = `${supabaseUrl}/functions/v1/transcribe-webhook`;

  const submitRes = await fetch(`${ASSEMBLYAI_BASE}/transcript`, {
    method: "POST",
    headers: {
      authorization: apiKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      audio_url: signedUrl,
      language_code: languageCode,
      speaker_labels: true,
      summarization: true,
      summary_model: "informative",
      summary_type: "bullets",
      auto_chapters: true,
      entity_detection: true,
      auto_highlights: true,
      punctuate: true,
      format_text: true,
      webhook_url: webhookUrl,
      webhook_auth_header_name: "x-transcription-id",
      webhook_auth_header_value: transcriptionId,
    }),
  });

  if (!submitRes.ok) {
    const errBody = await submitRes.text();
    await admin
      .from("transcriptions")
      .update({
        status: "failed",
        error_message: `AssemblyAI retornou ${submitRes.status}: ${errBody.slice(0, 500)}`,
      })
      .eq("id", transcriptionId);
    return jsonError(`AssemblyAI ${submitRes.status}: ${errBody}`, 502);
  }

  const submitJson = await submitRes.json();
  const assemblyId = submitJson.id as string;

  await admin
    .from("transcriptions")
    .update({ assemblyai_id: assemblyId })
    .eq("id", transcriptionId);

  return new Response(
    JSON.stringify({
      ok: true,
      transcription_id: transcriptionId,
      provider: "assemblyai",
      assemblyai_id: assemblyId,
      status: "processing",
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
