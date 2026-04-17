-- ═══════════════════════════════════════════════════════════════════════════
-- FIX: Onboarding fechamento + bucket cliente-anexos
-- ───────────────────────────────────────────────────────────────────────────
-- Bug 1: Trigger trg_onboarding_complete_nps chama INSERT cs_nps_surveys
--         com colunas (client_id, status) que NÃO existem na tabela.
--         Causa: tabela cs_nps_surveys é definição de survey (name,
--         trigger_type, active), não respostas. O INSERT falha e propaga
--         erro para o RPC complete_onboarding, impedindo fechamento.
--
--         Fix: dropar a trigger e a function. Quando NPS for implementado
--         corretamente (com pending responses), recriar.
--
-- Bug 2: Bucket 'cliente-anexos' não existe no storage. Upload de logos
--         e arquivos do cliente via IntelligenceSection falha silenciosamente.
--
--         Fix: criar bucket público + RLS policies para authenticated.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Bug 1: Dropar trigger e function quebrados ──────────────────────────

DROP TRIGGER IF EXISTS trg_onboarding_complete_nps ON public.onboardings;
DROP FUNCTION IF EXISTS public.auto_schedule_nps_on_onboarding_complete();

-- ─── Bug 2: Criar bucket 'cliente-anexos' ────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cliente-anexos',
  'cliente-anexos',
  true,                         -- público (getPublicUrl funciona no frontend)
  52428800,                     -- 50 MB
  NULL                          -- qualquer mime type (logo, contrato, pdf, etc)
)
ON CONFLICT (id) DO NOTHING;

-- Policies: qualquer usuário autenticado pode ler/enviar/deletar
DO $$ BEGIN
  -- Select (download)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cliente_anexos_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "cliente_anexos_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'cliente-anexos');
  END IF;

  -- Insert (upload)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cliente_anexos_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "cliente_anexos_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'cliente-anexos');
  END IF;

  -- Update (upsert)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cliente_anexos_update' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "cliente_anexos_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'cliente-anexos');
  END IF;

  -- Delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'cliente_anexos_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "cliente_anexos_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'cliente-anexos');
  END IF;
END $$;

-- ─── Criar bucket 'onboarding-transcricoes' (se também faltava) ──────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'onboarding-transcricoes',
  'onboarding-transcricoes',
  false,
  10485760,                     -- 10 MB
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Policies pra onboarding-transcricoes
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_transcricoes_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "onboarding_transcricoes_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'onboarding-transcricoes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_transcricoes_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "onboarding_transcricoes_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'onboarding-transcricoes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_transcricoes_update' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "onboarding_transcricoes_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'onboarding-transcricoes');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'onboarding_transcricoes_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "onboarding_transcricoes_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'onboarding-transcricoes');
  END IF;
END $$;
