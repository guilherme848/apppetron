-- DISC behavioral assessment
-- Etapa "Teste Comportamental" do funil de RH
--
-- Fluxo:
--   1. Recrutador clica "Enviar Teste DISC" → cria assessment com token
--   2. Candidato abre /teste-disc/{token} (público) → responde 24 perguntas
--   3. Submit dispara cálculo dos 4 escores (D/I/S/C) em dois eixos:
--        - "Adaptado" (MAIS parecido comigo) → comportamento sob ambiente
--        - "Natural"  (MENOS parecido comigo) → comportamento instintivo
--   4. Recrutador vê resultado no detalhe do candidato

BEGIN;

-- ─── ENUM: status do assessment ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_disc_status') THEN
    CREATE TYPE public.hr_disc_status AS ENUM ('pending', 'in_progress', 'completed', 'expired');
  END IF;
END $$;

-- ─── TABELA: hr_disc_assessments ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_disc_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE
    DEFAULT replace(gen_random_uuid()::text, '-', '') ||
            replace(gen_random_uuid()::text, '-', ''),

  status public.hr_disc_status NOT NULL DEFAULT 'pending',

  -- Respostas: array [{q: 1..24, most: 'D'|'I'|'S'|'C', least: 'D'|'I'|'S'|'C'}]
  responses JSONB,

  -- Escores (0..24) — preenchidos no submit
  score_d_most INT,
  score_i_most INT,
  score_s_most INT,
  score_c_most INT,
  score_d_least INT,
  score_i_least INT,
  score_s_least INT,
  score_c_least INT,

  -- Perfil dominante (string com até 2 letras, ex "DI", "S", "DC")
  dominant_profile TEXT,

  invited_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_disc_application ON public.hr_disc_assessments(application_id);
CREATE INDEX IF NOT EXISTS idx_hr_disc_token ON public.hr_disc_assessments(access_token);
CREATE INDEX IF NOT EXISTS idx_hr_disc_status ON public.hr_disc_assessments(status);

DROP TRIGGER IF EXISTS trg_hr_disc_assessments_updated ON public.hr_disc_assessments;
CREATE TRIGGER trg_hr_disc_assessments_updated
  BEFORE UPDATE ON public.hr_disc_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.hr_set_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.hr_disc_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_all_hr_disc_assessments" ON public.hr_disc_assessments;
CREATE POLICY "authenticated_all_hr_disc_assessments"
ON public.hr_disc_assessments FOR ALL
TO authenticated
USING (true) WITH CHECK (true);

-- Anônimos só acessam via RPCs (SECURITY DEFINER) — sem policy direta

-- ─── RPC: criar convite ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hr_disc_create_invite(
  p_application_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing RECORD;
  v_member_id UUID;
  v_token TEXT;
  v_id UUID;
BEGIN
  -- Reaproveitar convite pendente, se já existir
  SELECT id, access_token, status INTO v_existing
  FROM public.hr_disc_assessments
  WHERE application_id = p_application_id
    AND status IN ('pending', 'in_progress')
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'access_token', v_existing.access_token,
      'status', v_existing.status,
      'reused', true
    );
  END IF;

  SELECT id INTO v_member_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO public.hr_disc_assessments (application_id, invited_by_member_id)
  VALUES (p_application_id, v_member_id)
  RETURNING id, access_token INTO v_id, v_token;

  INSERT INTO public.hr_application_events (application_id, event_type, description)
  VALUES (p_application_id, 'note_added', '[DISC] Convite enviado pro candidato');

  RETURN jsonb_build_object(
    'id', v_id,
    'access_token', v_token,
    'status', 'pending',
    'reused', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_disc_create_invite(UUID) TO authenticated;

-- ─── RPC: ler por token (público) ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.hr_disc_get_by_token(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment RECORD;
  v_candidate RECORD;
  v_job RECORD;
BEGIN
  SELECT * INTO v_assessment
  FROM public.hr_disc_assessments
  WHERE access_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_invalido');
  END IF;

  SELECT c.full_name INTO v_candidate
  FROM public.hr_candidates c
  JOIN public.hr_applications a ON a.candidate_id = c.id
  WHERE a.id = v_assessment.application_id
  LIMIT 1;

  SELECT j.title INTO v_job
  FROM public.hr_jobs j
  JOIN public.hr_applications a ON a.job_id = j.id
  WHERE a.id = v_assessment.application_id
  LIMIT 1;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_assessment.id,
    'status', v_assessment.status,
    'candidate_name', v_candidate.full_name,
    'job_title', v_job.title,
    'started_at', v_assessment.started_at,
    'completed_at', v_assessment.completed_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_disc_get_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_disc_get_by_token(TEXT) TO authenticated;

-- ─── RPC: marcar como iniciado ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.hr_disc_mark_started(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.hr_disc_assessments
  SET status = 'in_progress',
      started_at = COALESCE(started_at, now())
  WHERE access_token = p_token AND status = 'pending';

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_disc_mark_started(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_disc_mark_started(TEXT) TO authenticated;

-- ─── RPC: submit (público) ─────────────────────────────────────────
-- Recebe responses [{q, most, least}] já validadas no client.
-- Calcula 8 escores (D/I/S/C × MOST/LEAST), determina perfil dominante.
CREATE OR REPLACE FUNCTION public.hr_disc_submit(
  p_token TEXT,
  p_responses JSONB    -- array de 24 objetos { q, most: 'D'|'I'|'S'|'C', least: 'D'|'I'|'S'|'C' }
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assessment RECORD;
  v_d_most INT := 0;
  v_i_most INT := 0;
  v_s_most INT := 0;
  v_c_most INT := 0;
  v_d_least INT := 0;
  v_i_least INT := 0;
  v_s_least INT := 0;
  v_c_least INT := 0;
  v_resp JSONB;
  v_dominant TEXT := '';
  v_diffs JSONB;
BEGIN
  SELECT * INTO v_assessment
  FROM public.hr_disc_assessments
  WHERE access_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_invalido');
  END IF;

  IF v_assessment.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ja_respondido');
  END IF;

  IF jsonb_array_length(p_responses) <> 24 THEN
    RETURN jsonb_build_object('success', false, 'error', 'numero_respostas_invalido');
  END IF;

  -- Contagem
  FOR v_resp IN SELECT * FROM jsonb_array_elements(p_responses) LOOP
    CASE v_resp->>'most'
      WHEN 'D' THEN v_d_most := v_d_most + 1;
      WHEN 'I' THEN v_i_most := v_i_most + 1;
      WHEN 'S' THEN v_s_most := v_s_most + 1;
      WHEN 'C' THEN v_c_most := v_c_most + 1;
      ELSE NULL;
    END CASE;
    CASE v_resp->>'least'
      WHEN 'D' THEN v_d_least := v_d_least + 1;
      WHEN 'I' THEN v_i_least := v_i_least + 1;
      WHEN 'S' THEN v_s_least := v_s_least + 1;
      WHEN 'C' THEN v_c_least := v_c_least + 1;
      ELSE NULL;
    END CASE;
  END LOOP;

  -- Perfil dominante = top 2 dimensões pelo escore real (MOST - LEAST)
  v_diffs := jsonb_build_object(
    'D', v_d_most - v_d_least,
    'I', v_i_most - v_i_least,
    'S', v_s_most - v_s_least,
    'C', v_c_most - v_c_least
  );

  WITH ranked AS (
    SELECT key, (value)::int AS score
    FROM jsonb_each_text(v_diffs)
    ORDER BY (value)::int DESC, key
  )
  SELECT string_agg(key, '' ORDER BY score DESC) INTO v_dominant
  FROM (
    SELECT key, score FROM ranked WHERE score > 0 LIMIT 2
  ) top;

  IF v_dominant IS NULL OR v_dominant = '' THEN
    -- Fallback: pega a maior, mesmo se 0
    SELECT key INTO v_dominant
    FROM jsonb_each_text(v_diffs)
    ORDER BY (value)::int DESC, key
    LIMIT 1;
  END IF;

  UPDATE public.hr_disc_assessments
  SET responses = p_responses,
      status = 'completed',
      completed_at = now(),
      score_d_most = v_d_most,
      score_i_most = v_i_most,
      score_s_most = v_s_most,
      score_c_most = v_c_most,
      score_d_least = v_d_least,
      score_i_least = v_i_least,
      score_s_least = v_s_least,
      score_c_least = v_c_least,
      dominant_profile = v_dominant
  WHERE id = v_assessment.id;

  INSERT INTO public.hr_application_events (application_id, event_type, description)
  VALUES (
    v_assessment.application_id,
    'note_added',
    format('[DISC] Teste respondido — perfil dominante: %s', v_dominant)
  );

  RETURN jsonb_build_object(
    'success', true,
    'dominant_profile', v_dominant,
    'scores', jsonb_build_object(
      'most',  jsonb_build_object('D', v_d_most,  'I', v_i_most,  'S', v_s_most,  'C', v_c_most),
      'least', jsonb_build_object('D', v_d_least, 'I', v_i_least, 'S', v_s_least, 'C', v_c_least)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_disc_submit(TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_disc_submit(TEXT, JSONB) TO authenticated;

COMMIT;
