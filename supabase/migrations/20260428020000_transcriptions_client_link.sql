-- ═══════════════════════════════════════════════════════════════════════════
-- Vincular transcrições a clientes (accounts)
-- ───────────────────────────────────────────────────────────────────────────
-- Adiciona FK opcional `client_id` em transcriptions → accounts.id, pra
-- permitir filtrar a lista por cliente e atrelar reuniões/vídeos à conta.
-- ON DELETE SET NULL: se a conta for removida, a transcrição não some.
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.transcriptions
  ADD COLUMN IF NOT EXISTS client_id uuid NULL
    REFERENCES public.accounts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transcriptions_client_id
  ON public.transcriptions (client_id)
  WHERE client_id IS NOT NULL;

COMMENT ON COLUMN public.transcriptions.client_id IS
  'Cliente opcional vinculado (FK accounts.id). Usado pra filtros e agrupamentos.';
