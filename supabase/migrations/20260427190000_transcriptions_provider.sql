-- ═══════════════════════════════════════════════════════════════════════════
-- Estratégia híbrida de provider de transcrição
-- ───────────────────────────────────────────────────────────────────────────
-- Adiciona coluna `provider` em transcriptions:
--   - groq:       Whisper Large V3 (síncrono, US$ 0.04/h, sem diarização,
--                 limite 25 MB) — usado pra vídeos curtos
--   - assemblyai: AssemblyAI Universal-2 (async via webhook, US$ 0.37/h,
--                 com diarização + summary + chapters) — usado pra vídeos
--                 grandes ou quando precisamos de diarização
--
-- Decisão de roteamento (em transcribe-start):
--   tamanho < 22 MB  → groq
--   tamanho >= 22 MB → assemblyai
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS provider text NULL;

ALTER TABLE public.transcriptions
  DROP CONSTRAINT IF EXISTS transcriptions_provider_check;

ALTER TABLE public.transcriptions
  ADD CONSTRAINT transcriptions_provider_check
  CHECK (provider IS NULL OR provider IN ('groq','assemblyai'));

COMMENT ON COLUMN public.transcriptions.provider IS
  'Provider escolhido: groq (sync, barato, sem diarização) ou assemblyai (async, completo)';

CREATE INDEX IF NOT EXISTS idx_transcriptions_provider
  ON public.transcriptions (provider)
  WHERE provider IS NOT NULL;
