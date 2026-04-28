-- Avaliação estruturada de entrevista + Target DISC + Teste técnico
--
-- Adiciona ao funil de RH:
--  1. target_disc: perfil DISC ideal por vaga (0..100 cada dimensão)
--  2. competencies: lista de competências p/ avaliação pós-entrevista
--  3. interview_script: roteiro de perguntas a fazer em cada entrevista
--  4. technical_test: definição opcional de teste técnico (briefing + rubrica)
--  5. tabela hr_interview_evaluations: nota por competência + decisão + justificativa
--  6. tabela hr_technical_submissions: convite + entrega + avaliação
--  7. RPCs públicas pra fluxo do candidato (sem auth)

BEGIN;

-- ─── 1. Colunas novas em hr_job_profiles ───────────────────────────
ALTER TABLE public.hr_job_profiles
  ADD COLUMN IF NOT EXISTS target_disc JSONB,                                  -- { D, I, S, C } 0..100
  ADD COLUMN IF NOT EXISTS competencies JSONB DEFAULT '[]'::jsonb,             -- [{ name, weight, description? }]
  ADD COLUMN IF NOT EXISTS interview_script JSONB DEFAULT '[]'::jsonb,         -- [{ question, focus_competency? }]
  ADD COLUMN IF NOT EXISTS technical_test JSONB;                               -- { enabled, title, briefing, deadline_hours, rubric: [{criterion, weight, description?}] }

-- ─── 2. Defaults inteligentes para perfis existentes ───────────────
-- Heurística por palavra-chave no title_internal pra popular target_disc + competencies + interview_script.

WITH defaults AS (
  SELECT
    id,
    -- Mapping target DISC por palavra-chave
    CASE
      WHEN title_internal ILIKE '%vended%' OR title_internal ILIKE '%sdr%' OR title_internal ILIKE '%pré-vend%' OR title_internal ILIKE '%pre-vend%' OR title_internal ILIKE '%comercial%'
        THEN '{"D":75,"I":80,"S":35,"C":40}'::jsonb
      WHEN title_internal ILIKE '%tráfego%' OR title_internal ILIKE '%trafego%' OR title_internal ILIKE '%mídia%' OR title_internal ILIKE '%midia%' OR title_internal ILIKE '%performance%' OR title_internal ILIKE '%analista%'
        THEN '{"D":70,"I":35,"S":40,"C":85}'::jsonb
      WHEN title_internal ILIKE '%videomaker%' OR title_internal ILIKE '%video%' OR title_internal ILIKE '%edit%'
        THEN '{"D":50,"I":55,"S":65,"C":75}'::jsonb
      WHEN title_internal ILIKE '%social%' OR title_internal ILIKE '%conteúdo%' OR title_internal ILIKE '%conteudo%' OR title_internal ILIKE '%community%'
        THEN '{"D":50,"I":80,"S":50,"C":60}'::jsonb
      WHEN title_internal ILIKE '%cs%' OR title_internal ILIKE '%sucesso%' OR title_internal ILIKE '%atendimento%' OR title_internal ILIKE '%onboarding%'
        THEN '{"D":40,"I":75,"S":80,"C":50}'::jsonb
      WHEN title_internal ILIKE '%design%'
        THEN '{"D":50,"I":60,"S":60,"C":75}'::jsonb
      WHEN title_internal ILIKE '%lider%' OR title_internal ILIKE '%gestor%' OR title_internal ILIKE '%coordenador%' OR title_internal ILIKE '%head%'
        THEN '{"D":80,"I":65,"S":50,"C":60}'::jsonb
      ELSE '{"D":50,"I":50,"S":50,"C":50}'::jsonb
    END AS target_disc,

    -- Competências base (5 universais p/ agência) — peso 1..5
    '[
      {"name":"Comunicação","weight":4,"description":"Clareza, escuta, articulação de ideias"},
      {"name":"Proatividade","weight":4,"description":"Antecipa problemas, não espera comando"},
      {"name":"Conhecimento técnico","weight":5,"description":"Domínio das ferramentas e métodos da vaga"},
      {"name":"Fit cultural","weight":4,"description":"Alinhamento com valores Petron — entrega, ritmo, dono do resultado"},
      {"name":"Capacidade analítica","weight":3,"description":"Lê dado, identifica causa, decide com base"}
    ]'::jsonb AS competencies,

    -- Roteiro genérico (recrutador adapta no editor)
    '[
      {"question":"Conta um pouco da sua trajetória em 2 minutos — começo, virada, hoje.","focus_competency":"Comunicação"},
      {"question":"Qual foi o resultado mais relevante que você entregou nos últimos 12 meses? Como mediu?","focus_competency":"Conhecimento técnico"},
      {"question":"Conta uma situação onde você identificou um problema antes do time perceber e agiu.","focus_competency":"Proatividade"},
      {"question":"Como você lida com um colega/gestor que discorda da sua decisão técnica? Conta um caso real.","focus_competency":"Fit cultural"},
      {"question":"Olha esse cenário hipotético: [descrever um problema da vaga]. O que você faria primeiro? Em 30 dias?","focus_competency":"Capacidade analítica"},
      {"question":"Por que essa vaga? Por que Petron? Por que agora?","focus_competency":"Fit cultural"}
    ]'::jsonb AS interview_script
  FROM public.hr_job_profiles
)
UPDATE public.hr_job_profiles p
SET
  target_disc = COALESCE(p.target_disc, d.target_disc),
  competencies = CASE WHEN p.competencies IS NULL OR p.competencies = '[]'::jsonb THEN d.competencies ELSE p.competencies END,
  interview_script = CASE WHEN p.interview_script IS NULL OR p.interview_script = '[]'::jsonb THEN d.interview_script ELSE p.interview_script END,
  updated_at = now()
FROM defaults d
WHERE p.id = d.id;

-- ─── 3. ENUM: status do teste técnico ──────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_tech_status') THEN
    CREATE TYPE public.hr_tech_status AS ENUM ('pending', 'submitted', 'evaluated', 'expired');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'hr_decision') THEN
    CREATE TYPE public.hr_decision AS ENUM ('advance', 'hold', 'reject');
  END IF;
END $$;

-- ─── 4. TABELA: hr_interview_evaluations ───────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_interview_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.hr_pipeline_stages(id) ON DELETE SET NULL,
  stage_name TEXT,                                                              -- snapshot do nome da etapa
  evaluator_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  scores JSONB NOT NULL DEFAULT '[]'::jsonb,                                    -- [{ competency, weight, score: 1..5, notes? }]
  decision public.hr_decision,
  justification TEXT,
  total_score NUMERIC(5,2),                                                     -- média ponderada 0..100
  notes TEXT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_eval_application ON public.hr_interview_evaluations(application_id);
CREATE INDEX IF NOT EXISTS idx_hr_eval_stage ON public.hr_interview_evaluations(stage_id);

DROP TRIGGER IF EXISTS trg_hr_eval_updated ON public.hr_interview_evaluations;
CREATE TRIGGER trg_hr_eval_updated BEFORE UPDATE ON public.hr_interview_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

ALTER TABLE public.hr_interview_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_hr_eval" ON public.hr_interview_evaluations;
CREATE POLICY "auth_all_hr_eval" ON public.hr_interview_evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 5. TABELA: hr_technical_submissions ───────────────────────────
CREATE TABLE IF NOT EXISTS public.hr_technical_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL UNIQUE
    DEFAULT replace(gen_random_uuid()::text, '-', '') ||
            replace(gen_random_uuid()::text, '-', ''),
  status public.hr_tech_status NOT NULL DEFAULT 'pending',
  -- snapshot do teste no momento do envio (briefing/rubric podem mudar)
  test_snapshot JSONB,                                                          -- { title, briefing, deadline_hours, rubric }
  -- Submissão do candidato
  submission_url TEXT,
  submission_text TEXT,
  submitted_at TIMESTAMPTZ,
  -- Avaliação do recrutador
  scores JSONB DEFAULT '[]'::jsonb,                                              -- [{ criterion, weight, score: 1..5, notes? }]
  total_score NUMERIC(5,2),                                                       -- 0..100
  decision public.hr_decision,
  evaluator_notes TEXT,
  evaluator_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  evaluated_at TIMESTAMPTZ,
  -- Convite
  invited_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  deadline_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_tech_application ON public.hr_technical_submissions(application_id);
CREATE INDEX IF NOT EXISTS idx_hr_tech_token ON public.hr_technical_submissions(access_token);
CREATE INDEX IF NOT EXISTS idx_hr_tech_status ON public.hr_technical_submissions(status);

DROP TRIGGER IF EXISTS trg_hr_tech_updated ON public.hr_technical_submissions;
CREATE TRIGGER trg_hr_tech_updated BEFORE UPDATE ON public.hr_technical_submissions
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

ALTER TABLE public.hr_technical_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_hr_tech" ON public.hr_technical_submissions;
CREATE POLICY "auth_all_hr_tech" ON public.hr_technical_submissions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 6. RPC: criar convite de teste técnico ────────────────────────
CREATE OR REPLACE FUNCTION public.hr_tech_create_invite(p_application_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_id UUID;
  v_profile RECORD;
  v_test JSONB;
  v_deadline INT;
  v_existing RECORD;
  v_id UUID;
  v_token TEXT;
BEGIN
  -- Reaproveita pendente
  SELECT * INTO v_existing
  FROM public.hr_technical_submissions
  WHERE application_id = p_application_id AND status IN ('pending')
  ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_existing.id,
      'access_token', v_existing.access_token,
      'status', v_existing.status,
      'reused', true
    );
  END IF;

  -- Pega test config do profile da vaga
  SELECT prof.technical_test INTO v_test
  FROM public.hr_applications a
  JOIN public.hr_jobs j ON j.id = a.job_id
  JOIN public.hr_job_profiles prof ON prof.id = j.job_profile_id
  WHERE a.id = p_application_id;

  IF v_test IS NULL OR (v_test->>'enabled')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object('success', false, 'error', 'Teste técnico não está habilitado pra essa vaga');
  END IF;

  v_deadline := COALESCE((v_test->>'deadline_hours')::int, 72);

  SELECT id INTO v_member_id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1;

  INSERT INTO public.hr_technical_submissions (
    application_id, test_snapshot, deadline_at, invited_by_member_id
  )
  VALUES (
    p_application_id, v_test, now() + (v_deadline || ' hours')::interval, v_member_id
  )
  RETURNING id, access_token INTO v_id, v_token;

  INSERT INTO public.hr_application_events (application_id, event_type, description)
  VALUES (p_application_id, 'note_added', '[Teste técnico] Convite enviado pro candidato');

  RETURN jsonb_build_object(
    'success', true,
    'id', v_id,
    'access_token', v_token,
    'status', 'pending',
    'reused', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_tech_create_invite(UUID) TO authenticated;

-- ─── 7. RPC: ler por token (público) ───────────────────────────────
CREATE OR REPLACE FUNCTION public.hr_tech_get_by_token(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
  v_candidate_name TEXT;
  v_job_title TEXT;
BEGIN
  SELECT * INTO v_sub FROM public.hr_technical_submissions WHERE access_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_invalido');
  END IF;

  SELECT c.full_name, j.title
    INTO v_candidate_name, v_job_title
  FROM public.hr_applications a
  JOIN public.hr_candidates c ON c.id = a.candidate_id
  JOIN public.hr_jobs j ON j.id = a.job_id
  WHERE a.id = v_sub.application_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_sub.id,
    'status', v_sub.status,
    'candidate_name', v_candidate_name,
    'job_title', v_job_title,
    'test', v_sub.test_snapshot,
    'submission_url', v_sub.submission_url,
    'submission_text', v_sub.submission_text,
    'submitted_at', v_sub.submitted_at,
    'deadline_at', v_sub.deadline_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_tech_get_by_token(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_tech_get_by_token(TEXT) TO authenticated;

-- ─── 8. RPC: submissão (público) ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.hr_tech_submit(p_token TEXT, p_url TEXT, p_text TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT * INTO v_sub FROM public.hr_technical_submissions WHERE access_token = p_token LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'token_invalido');
  END IF;
  IF v_sub.status NOT IN ('pending') THEN
    RETURN jsonb_build_object('success', false, 'error', 'ja_enviado');
  END IF;
  IF v_sub.deadline_at IS NOT NULL AND now() > v_sub.deadline_at THEN
    UPDATE public.hr_technical_submissions SET status = 'expired' WHERE id = v_sub.id;
    RETURN jsonb_build_object('success', false, 'error', 'prazo_expirado');
  END IF;

  IF (p_url IS NULL OR p_url = '') AND (p_text IS NULL OR p_text = '') THEN
    RETURN jsonb_build_object('success', false, 'error', 'submissao_vazia');
  END IF;

  UPDATE public.hr_technical_submissions
  SET status = 'submitted',
      submission_url = NULLIF(trim(p_url), ''),
      submission_text = NULLIF(trim(p_text), ''),
      submitted_at = now()
  WHERE id = v_sub.id;

  INSERT INTO public.hr_application_events (application_id, event_type, description)
  VALUES (v_sub.application_id, 'note_added', '[Teste técnico] Candidato submeteu entrega');

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_tech_submit(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_tech_submit(TEXT, TEXT, TEXT) TO authenticated;

COMMIT;
