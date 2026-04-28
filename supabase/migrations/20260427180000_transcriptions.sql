-- ═══════════════════════════════════════════════════════════════════════════
-- TRANSCRIÇÕES DE VÍDEO (Petron OS)
-- ───────────────────────────────────────────────────────────────────────────
-- Tabela `transcriptions`: armazena vídeos enviados, status do processamento
-- AssemblyAI, transcript completo (utterances com timestamp + speaker),
-- summary, action items, chapters, entities.
--
-- Fluxo:
--  1. Frontend faz upload pro bucket `transcription-videos` (privado)
--  2. Cria row em transcriptions (status=processing)
--  3. Edge Function `transcribe-start` gera signed URL e chama AssemblyAI
--  4. AssemblyAI dispara webhook ao terminar → Edge `transcribe-webhook`
--     puxa resultado completo e popula a row (status=completed/failed)
--  5. Frontend (Realtime) atualiza UI ao detectar mudança de status
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.transcriptions (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vínculo opcional com outras entidades (CRM, Content, etc) — futuro
  source_type     text          NOT NULL DEFAULT 'manual',  -- manual | crm | content | reuniao
  source_id       uuid          NULL,

  -- Metadados do arquivo
  title           text          NOT NULL,
  notes           text          NULL,
  video_path      text          NOT NULL,                   -- path no bucket
  video_size_bytes bigint       NULL,
  video_mime_type text          NULL,
  duration_seconds numeric      NULL,                       -- preenchido pelo AssemblyAI
  language_code   text          NOT NULL DEFAULT 'pt',

  -- Estado de processamento
  status          text          NOT NULL DEFAULT 'pending', -- pending | uploading | queued | processing | completed | failed
  error_message   text          NULL,

  -- Integração AssemblyAI
  assemblyai_id   text          NULL,                       -- id do transcript na AssemblyAI

  -- Resultado (populado pelo webhook)
  transcript_text text          NULL,                       -- texto completo plano
  utterances      jsonb         NULL,                       -- [{speaker, start, end, text, confidence, words}]
  summary         text          NULL,
  chapters        jsonb         NULL,                       -- [{start, end, headline, gist, summary}]
  entities        jsonb         NULL,                       -- [{entity_type, text, start, end}]
  highlights      jsonb         NULL,                       -- [{text, count, rank, timestamps}]
  action_items    jsonb         NULL,                       -- derivado do summary (futuro)
  speakers        text[]        NULL,                       -- ["A","B",...]
  raw_response    jsonb         NULL,                       -- response completa pra debug

  -- Custo (cents BRL estimado)
  cost_cents      integer       NULL,

  -- Auditoria
  created_by      uuid          NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now(),
  completed_at    timestamptz   NULL
);

-- Constraint de status válido
ALTER TABLE public.transcriptions
  DROP CONSTRAINT IF EXISTS transcriptions_status_check;
ALTER TABLE public.transcriptions
  ADD CONSTRAINT transcriptions_status_check
  CHECK (status IN ('pending','uploading','queued','processing','completed','failed'));

-- Constraint de source_type
ALTER TABLE public.transcriptions
  DROP CONSTRAINT IF EXISTS transcriptions_source_type_check;
ALTER TABLE public.transcriptions
  ADD CONSTRAINT transcriptions_source_type_check
  CHECK (source_type IN ('manual','crm','content','reuniao','outro'));

-- Índices
CREATE INDEX IF NOT EXISTS idx_transcriptions_status
  ON public.transcriptions (status);
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_at
  ON public.transcriptions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcriptions_assemblyai_id
  ON public.transcriptions (assemblyai_id)
  WHERE assemblyai_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_source
  ON public.transcriptions (source_type, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transcriptions_created_by
  ON public.transcriptions (created_by);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.touch_transcriptions_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_transcriptions_updated_at ON public.transcriptions;
CREATE TRIGGER trg_transcriptions_updated_at
  BEFORE UPDATE ON public.transcriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_transcriptions_updated_at();

-- RLS
ALTER TABLE public.transcriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transcriptions_select_authenticated" ON public.transcriptions;
CREATE POLICY "transcriptions_select_authenticated"
  ON public.transcriptions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "transcriptions_insert_authenticated" ON public.transcriptions;
CREATE POLICY "transcriptions_insert_authenticated"
  ON public.transcriptions FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "transcriptions_update_authenticated" ON public.transcriptions;
CREATE POLICY "transcriptions_update_authenticated"
  ON public.transcriptions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "transcriptions_delete_authenticated" ON public.transcriptions;
CREATE POLICY "transcriptions_delete_authenticated"
  ON public.transcriptions FOR DELETE
  TO authenticated
  USING (true);

-- Habilitar Realtime pra UI atualizar quando webhook concluir
ALTER PUBLICATION supabase_realtime ADD TABLE public.transcriptions;

-- ─── Bucket: transcription-videos (privado) ──────────────────────────────
-- Privado porque vídeos podem conter info sensível de cliente/reuniões.
-- AssemblyAI acessa via signed URL gerada pela edge function.
-- Limite: 5 GB por arquivo (vídeos de 2-3h em 1080p chegam a ~3GB).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'transcription-videos',
  'transcription-videos',
  false,
  5368709120,                     -- 5 GB
  ARRAY[
    'video/mp4','video/quicktime','video/x-msvideo','video/webm',
    'video/x-matroska','video/mpeg','video/3gpp','video/avi','video/mov',
    'audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/webm',
    'audio/mp4','audio/m4a','audio/x-m4a','audio/ogg','audio/flac','audio/aac'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = EXCLUDED.public;

-- Storage policies
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'transcription_videos_select' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "transcription_videos_select"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'transcription-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'transcription_videos_insert' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "transcription_videos_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'transcription-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'transcription_videos_update' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "transcription_videos_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'transcription-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'transcription_videos_delete' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "transcription_videos_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'transcription-videos');
  END IF;
END $$;

-- Comments
COMMENT ON TABLE  public.transcriptions IS 'Transcrições de vídeo via AssemblyAI (Petron OS)';
COMMENT ON COLUMN public.transcriptions.utterances IS 'Array de segmentos com {speaker,start,end,text,confidence,words}';
COMMENT ON COLUMN public.transcriptions.assemblyai_id IS 'ID do transcript na AssemblyAI — usado pelo webhook pra fazer match';
