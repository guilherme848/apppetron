-- ============================================================================
-- MÓDULO RH: Recrutamento & Seleção (ATS)
--
-- Cria schema completo para:
-- - Funções (job profiles reutilizáveis)
-- - Vagas com pipeline customizável por etapas
-- - Formulários públicos de inscrição com builder
-- - Candidatos unificados
-- - Inscrições (applications) conectando candidato x vaga
-- - Análises de IA (Claude) sobre candidatos
-- - Timeline de eventos por inscrição
--
-- Storage bucket: hr-resumes (privado)
-- RLS: authenticated users veem tudo, anon pode criar via formulários públicos
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ENUMS
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE hr_seniority AS ENUM ('estagio', 'junior', 'pleno', 'senior', 'especialista', 'lideranca');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_contract_type AS ENUM ('clt', 'pj', 'estagio', 'freelancer', 'temporario');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_modality AS ENUM ('presencial', 'remoto', 'hibrido');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_profile_status AS ENUM ('active', 'archived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_job_status AS ENUM ('draft', 'open', 'paused', 'closed');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_application_status AS ENUM ('active', 'hired', 'rejected', 'withdrawn', 'on_hold');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_question_type AS ENUM (
    'text', 'textarea', 'email', 'phone', 'date', 'number',
    'select', 'multiselect', 'scale', 'url', 'checkbox', 'file'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_ai_recommendation AS ENUM ('advance', 'hold', 'reject', 'strong_advance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE hr_event_type AS ENUM (
    'application_created',
    'stage_changed',
    'note_added',
    'ai_analyzed',
    'resume_uploaded',
    'rejected',
    'hired',
    'rating_changed',
    'withdrawn',
    'email_sent'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FUNÇÕES AUXILIARES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_slugify(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN regexp_replace(
    regexp_replace(
      lower(unaccent(coalesce(input_text, ''))),
      '[^a-z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  );
END;
$$;

-- Trigger de updated_at genérico (reutiliza se já existir)
CREATE OR REPLACE FUNCTION public.hr_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TABELA: hr_job_profiles (Funções)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_job_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidade
  title_internal TEXT NOT NULL,
  title_public TEXT NOT NULL,
  department TEXT,
  seniority hr_seniority NOT NULL DEFAULT 'pleno',
  contract_type hr_contract_type NOT NULL DEFAULT 'clt',
  modality hr_modality NOT NULL DEFAULT 'presencial',
  base_city TEXT,
  manager_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  synonyms TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Conteúdo (abas do editor)
  mission TEXT,                          -- Missão
  deliverables JSONB DEFAULT '[]'::jsonb,-- Entregáveis (array de strings)
  skills JSONB DEFAULT '[]'::jsonb,      -- Skills (array de { name, level, required })
  tools JSONB DEFAULT '[]'::jsonb,       -- Ferramentas (array de { name, required })
  requirements JSONB DEFAULT '[]'::jsonb,-- Requisitos (array de strings)
  process JSONB DEFAULT '[]'::jsonb,     -- Processo seletivo (array de etapas { name, description })
  plan_30 JSONB DEFAULT '[]'::jsonb,     -- Plano 30 dias (array de { day, goal, kpi })
  notes TEXT,                            -- Notas internas

  -- Pipeline default (é copiado ao criar vaga)
  default_stages JSONB DEFAULT '[
    {"name":"Análise do Candidato","order":0,"color":"#94a3b8","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Agendar Entrevista","order":1,"color":"#3b82f6","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Entrevista 001","order":2,"color":"#f59e0b","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Teste Comportamental","order":3,"color":"#a855f7","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Entrevista 002","order":4,"color":"#f59e0b","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Decisão","order":5,"color":"#10b981","is_terminal_success":true,"is_terminal_rejection":false}
  ]'::jsonb,

  status hr_profile_status NOT NULL DEFAULT 'active',
  created_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_job_profiles_status ON public.hr_job_profiles(status);
CREATE INDEX IF NOT EXISTS idx_hr_job_profiles_department ON public.hr_job_profiles(department);

DROP TRIGGER IF EXISTS trg_hr_job_profiles_updated ON public.hr_job_profiles;
CREATE TRIGGER trg_hr_job_profiles_updated
  BEFORE UPDATE ON public.hr_job_profiles
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TABELA: hr_jobs (Vagas)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_profile_id UUID REFERENCES public.hr_job_profiles(id) ON DELETE RESTRICT,

  -- Pode sobrescrever o título da função, mas default vem do profile
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,

  -- Snapshot do profile no momento da criação (pra não mudar se a função for editada depois)
  snapshot_profile JSONB,

  status hr_job_status NOT NULL DEFAULT 'draft',
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  closed_reason TEXT,

  -- Métricas cached (atualizadas via trigger)
  candidates_count INT NOT NULL DEFAULT 0,
  hired_count INT NOT NULL DEFAULT 0,

  manager_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_jobs_status ON public.hr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_profile ON public.hr_jobs(job_profile_id);
CREATE INDEX IF NOT EXISTS idx_hr_jobs_slug ON public.hr_jobs(slug);

DROP TRIGGER IF EXISTS trg_hr_jobs_updated ON public.hr_jobs;
CREATE TRIGGER trg_hr_jobs_updated
  BEFORE UPDATE ON public.hr_jobs
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TABELA: hr_pipeline_stages (Etapas do pipeline por vaga)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.hr_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#94a3b8',
  is_terminal_success BOOLEAN NOT NULL DEFAULT false,
  is_terminal_rejection BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_hr_pipeline_stages_job ON public.hr_pipeline_stages(job_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. TABELA: hr_forms (Formulários de inscrição)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.hr_jobs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,

  active BOOLEAN NOT NULL DEFAULT true,
  public BOOLEAN NOT NULL DEFAULT true,

  -- Textos customizáveis
  intro_text TEXT,
  success_message TEXT DEFAULT 'Obrigado pela sua inscrição! Entraremos em contato pelo WhatsApp informado.',
  submit_button_text TEXT DEFAULT 'Enviar inscrição',

  -- Segurança
  captcha_enabled BOOLEAN NOT NULL DEFAULT false,
  honeypot_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Upload
  resume_required BOOLEAN NOT NULL DEFAULT false,
  resume_formats TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'png', 'jpg'],
  resume_max_mb INT NOT NULL DEFAULT 10,

  -- Integração
  auto_ai_analysis BOOLEAN NOT NULL DEFAULT true,
  default_stage_order INT NOT NULL DEFAULT 0, -- estágio inicial no pipeline
  auto_tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  created_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_forms_job ON public.hr_forms(job_id);
CREATE INDEX IF NOT EXISTS idx_hr_forms_slug ON public.hr_forms(slug);
CREATE INDEX IF NOT EXISTS idx_hr_forms_active ON public.hr_forms(active);

DROP TRIGGER IF EXISTS trg_hr_forms_updated ON public.hr_forms;
CREATE TRIGGER trg_hr_forms_updated
  BEFORE UPDATE ON public.hr_forms
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. TABELA: hr_form_questions (Perguntas do formulário)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_form_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.hr_forms(id) ON DELETE CASCADE,

  order_index INT NOT NULL DEFAULT 0,
  field_key TEXT NOT NULL, -- chave técnica (ex: "full_name", "email")
  label TEXT NOT NULL,
  help_text TEXT,
  placeholder TEXT,
  field_type hr_question_type NOT NULL DEFAULT 'text',
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]'::jsonb, -- para select/multiselect/scale
  validation JSONB DEFAULT '{}'::jsonb, -- { min, max, pattern }
  default_value TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(form_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_hr_form_questions_form ON public.hr_form_questions(form_id);
CREATE INDEX IF NOT EXISTS idx_hr_form_questions_order ON public.hr_form_questions(form_id, order_index);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. TABELA: hr_candidates (Candidatos)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  birth_date DATE,
  city TEXT,
  state TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  source TEXT, -- de onde veio a primeira inscrição

  raw_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_candidates_email ON public.hr_candidates(email);
CREATE INDEX IF NOT EXISTS idx_hr_candidates_name ON public.hr_candidates(full_name);

DROP TRIGGER IF EXISTS trg_hr_candidates_updated ON public.hr_candidates;
CREATE TRIGGER trg_hr_candidates_updated
  BEFORE UPDATE ON public.hr_candidates
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. TABELA: hr_applications (Inscrições: candidato × vaga)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id UUID NOT NULL REFERENCES public.hr_candidates(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.hr_jobs(id) ON DELETE CASCADE,
  form_id UUID REFERENCES public.hr_forms(id) ON DELETE SET NULL,

  current_stage_id UUID REFERENCES public.hr_pipeline_stages(id) ON DELETE SET NULL,
  status hr_application_status NOT NULL DEFAULT 'active',
  rating SMALLINT CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),

  resume_url TEXT,
  resume_filename TEXT,
  internal_notes TEXT,

  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_at TIMESTAMPTZ,
  decided_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,

  -- Análise IA cached
  ai_score SMALLINT CHECK (ai_score IS NULL OR (ai_score >= 0 AND ai_score <= 100)),
  ai_recommendation hr_ai_recommendation,
  ai_analyzed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(candidate_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_hr_applications_job ON public.hr_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_hr_applications_candidate ON public.hr_applications(candidate_id);
CREATE INDEX IF NOT EXISTS idx_hr_applications_stage ON public.hr_applications(current_stage_id);
CREATE INDEX IF NOT EXISTS idx_hr_applications_status ON public.hr_applications(status);

DROP TRIGGER IF EXISTS trg_hr_applications_updated ON public.hr_applications;
CREATE TRIGGER trg_hr_applications_updated
  BEFORE UPDATE ON public.hr_applications
  FOR EACH ROW EXECUTE FUNCTION public.hr_set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. TABELA: hr_form_responses (Respostas)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.hr_form_questions(id) ON DELETE SET NULL,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  value JSONB, -- pode ser string, number, array, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_form_responses_application ON public.hr_form_responses(application_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. TABELA: hr_ai_analyses (Análises IA)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_ai_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,

  provider TEXT NOT NULL DEFAULT 'anthropic',
  model TEXT NOT NULL,
  prompt_version TEXT NOT NULL DEFAULT 'v1',

  score_overall SMALLINT CHECK (score_overall >= 0 AND score_overall <= 100),
  score_skills SMALLINT,
  score_experience SMALLINT,
  score_culture SMALLINT,

  strengths JSONB DEFAULT '[]'::jsonb,    -- array de strings
  gaps JSONB DEFAULT '[]'::jsonb,         -- array de strings
  red_flags JSONB DEFAULT '[]'::jsonb,    -- array de strings
  highlights JSONB DEFAULT '[]'::jsonb,   -- destaques relevantes
  recommendation hr_ai_recommendation,
  summary TEXT,
  full_response JSONB,

  tokens_input INT,
  tokens_output INT,

  created_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_ai_analyses_application ON public.hr_ai_analyses(application_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. TABELA: hr_application_events (Timeline)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.hr_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.hr_applications(id) ON DELETE CASCADE,
  event_type hr_event_type NOT NULL,
  description TEXT,
  from_stage_id UUID REFERENCES public.hr_pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID REFERENCES public.hr_pipeline_stages(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hr_application_events_app ON public.hr_application_events(application_id);
CREATE INDEX IF NOT EXISTS idx_hr_application_events_type ON public.hr_application_events(event_type);
CREATE INDEX IF NOT EXISTS idx_hr_application_events_date ON public.hr_application_events(created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. TRIGGERS: Sync de candidates_count em hr_jobs
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_sync_job_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.hr_jobs
    SET candidates_count = candidates_count + 1,
        updated_at = now()
    WHERE id = NEW.job_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.hr_jobs
    SET candidates_count = GREATEST(candidates_count - 1, 0),
        updated_at = now()
    WHERE id = OLD.job_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
      UPDATE public.hr_jobs
      SET hired_count = hired_count + 1, updated_at = now()
      WHERE id = NEW.job_id;
    ELSIF OLD.status = 'hired' AND NEW.status != 'hired' THEN
      UPDATE public.hr_jobs
      SET hired_count = GREATEST(hired_count - 1, 0), updated_at = now()
      WHERE id = NEW.job_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_sync_job_counts ON public.hr_applications;
CREATE TRIGGER trg_hr_sync_job_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.hr_applications
  FOR EACH ROW EXECUTE FUNCTION public.hr_sync_job_counts();

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. TRIGGER: Criar evento automático ao mudar stage
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_log_application_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hr_application_events (
      application_id, event_type, description, to_stage_id, metadata
    ) VALUES (
      NEW.id,
      'application_created',
      'Inscrição criada',
      NEW.current_stage_id,
      jsonb_build_object('source', 'trigger')
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id THEN
      INSERT INTO public.hr_application_events (
        application_id, event_type, description, from_stage_id, to_stage_id
      ) VALUES (
        NEW.id,
        'stage_changed',
        'Movido para nova etapa',
        OLD.current_stage_id,
        NEW.current_stage_id
      );
    END IF;

    IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
      INSERT INTO public.hr_application_events (
        application_id, event_type, description
      ) VALUES (NEW.id, 'hired', 'Candidato contratado');
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
      INSERT INTO public.hr_application_events (
        application_id, event_type, description
      ) VALUES (NEW.id, 'rejected', 'Candidato recusado');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_hr_log_application_events ON public.hr_applications;
CREATE TRIGGER trg_hr_log_application_events
  AFTER INSERT OR UPDATE ON public.hr_applications
  FOR EACH ROW EXECUTE FUNCTION public.hr_log_application_stage_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. STORAGE: Bucket hr-resumes
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hr-resumes',
  'hr-resumes',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ═══════════════════════════════════════════════════════════════════════════
-- 16. RLS: Row Level Security
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hr_job_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_form_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_application_events ENABLE ROW LEVEL SECURITY;

-- Authenticated users: full access (padrão do ERP interno)
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'hr_job_profiles',
    'hr_jobs',
    'hr_pipeline_stages',
    'hr_forms',
    'hr_form_questions',
    'hr_candidates',
    'hr_applications',
    'hr_form_responses',
    'hr_ai_analyses',
    'hr_application_events'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_all_%s" ON public.%I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "authenticated_all_%s" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      tbl, tbl
    );
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 17. RLS PÚBLICO: inscrições anônimas (pra página pública do formulário)
-- ═══════════════════════════════════════════════════════════════════════════

-- Ler formulários ativos e públicos
DROP POLICY IF EXISTS "anon_read_public_forms" ON public.hr_forms;
CREATE POLICY "anon_read_public_forms"
ON public.hr_forms FOR SELECT
TO anon
USING (active = true AND public = true);

-- Ler perguntas de formulários públicos ativos
DROP POLICY IF EXISTS "anon_read_public_questions" ON public.hr_form_questions;
CREATE POLICY "anon_read_public_questions"
ON public.hr_form_questions FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.hr_forms f
  WHERE f.id = hr_form_questions.form_id
    AND f.active = true
    AND f.public = true
));

-- Ler job info básica de formulários públicos
DROP POLICY IF EXISTS "anon_read_jobs_via_form" ON public.hr_jobs;
CREATE POLICY "anon_read_jobs_via_form"
ON public.hr_jobs FOR SELECT
TO anon
USING (EXISTS (
  SELECT 1 FROM public.hr_forms f
  WHERE f.job_id = hr_jobs.id
    AND f.active = true
    AND f.public = true
));

-- ═══════════════════════════════════════════════════════════════════════════
-- 18. RPC pública: submit_application (candidato anônimo envia inscrição)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_submit_application(
  p_form_slug TEXT,
  p_candidate JSONB,     -- { full_name, email, phone, birth_date, city, state, linkedin_url, portfolio_url }
  p_responses JSONB,     -- [{ field_key, label, value }, ...]
  p_resume_url TEXT DEFAULT NULL,
  p_resume_filename TEXT DEFAULT NULL,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_form RECORD;
  v_job RECORD;
  v_candidate_id UUID;
  v_application_id UUID;
  v_stage_id UUID;
  v_response JSONB;
BEGIN
  -- Anti-spam: honeypot não pode estar preenchido
  IF p_honeypot IS NOT NULL AND p_honeypot <> '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Spam detected');
  END IF;

  -- Buscar formulário público e ativo
  SELECT * INTO v_form
  FROM public.hr_forms
  WHERE slug = p_form_slug AND active = true AND public = true
  LIMIT 1;

  IF v_form IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Formulário não encontrado ou inativo');
  END IF;

  -- Buscar vaga correspondente
  SELECT * INTO v_job FROM public.hr_jobs WHERE id = v_form.job_id LIMIT 1;
  IF v_job IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vaga não encontrada');
  END IF;

  -- Validar email mínimo
  IF (p_candidate->>'email') IS NULL OR length(p_candidate->>'email') < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email é obrigatório');
  END IF;

  IF (p_candidate->>'full_name') IS NULL OR length(p_candidate->>'full_name') < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome completo é obrigatório');
  END IF;

  -- Upsert candidato
  INSERT INTO public.hr_candidates (
    full_name, email, phone, birth_date, city, state, linkedin_url, portfolio_url, source
  ) VALUES (
    p_candidate->>'full_name',
    lower(p_candidate->>'email'),
    p_candidate->>'phone',
    NULLIF(p_candidate->>'birth_date', '')::DATE,
    p_candidate->>'city',
    p_candidate->>'state',
    p_candidate->>'linkedin_url',
    p_candidate->>'portfolio_url',
    'form:' || p_form_slug
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, hr_candidates.phone),
    birth_date = COALESCE(EXCLUDED.birth_date, hr_candidates.birth_date),
    city = COALESCE(EXCLUDED.city, hr_candidates.city),
    state = COALESCE(EXCLUDED.state, hr_candidates.state),
    linkedin_url = COALESCE(EXCLUDED.linkedin_url, hr_candidates.linkedin_url),
    portfolio_url = COALESCE(EXCLUDED.portfolio_url, hr_candidates.portfolio_url),
    updated_at = now()
  RETURNING id INTO v_candidate_id;

  -- Verificar se já existe application pra esse candidato nessa vaga
  IF EXISTS (
    SELECT 1 FROM public.hr_applications
    WHERE candidate_id = v_candidate_id AND job_id = v_job.id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já se inscreveu nesta vaga. Aguarde nosso retorno.',
      'code', 'DUPLICATE'
    );
  END IF;

  -- Buscar stage inicial do pipeline
  SELECT id INTO v_stage_id
  FROM public.hr_pipeline_stages
  WHERE job_id = v_job.id
  ORDER BY order_index ASC
  LIMIT 1 OFFSET GREATEST(COALESCE(v_form.default_stage_order, 0), 0);

  -- Se não achar stage no offset, usa a primeira
  IF v_stage_id IS NULL THEN
    SELECT id INTO v_stage_id
    FROM public.hr_pipeline_stages
    WHERE job_id = v_job.id
    ORDER BY order_index ASC
    LIMIT 1;
  END IF;

  -- Criar application
  INSERT INTO public.hr_applications (
    candidate_id, job_id, form_id, current_stage_id, status,
    resume_url, resume_filename, applied_at
  ) VALUES (
    v_candidate_id,
    v_job.id,
    v_form.id,
    v_stage_id,
    'active',
    p_resume_url,
    p_resume_filename,
    now()
  )
  RETURNING id INTO v_application_id;

  -- Salvar respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(COALESCE(p_responses, '[]'::jsonb))
  LOOP
    INSERT INTO public.hr_form_responses (application_id, field_key, label, value)
    VALUES (
      v_application_id,
      v_response->>'field_key',
      v_response->>'label',
      v_response->'value'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'candidate_id', v_candidate_id,
    'message', v_form.success_message
  );
END;
$$;

-- Conceder execução pra anon
GRANT EXECUTE ON FUNCTION public.hr_submit_application(TEXT, JSONB, JSONB, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_submit_application(TEXT, JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 19. RPC: criar vaga a partir de profile (copia snapshot + stages)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.hr_create_job_from_profile(
  p_profile_id UUID,
  p_title TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_job_id UUID;
  v_stage JSONB;
  v_final_slug TEXT;
BEGIN
  SELECT * INTO v_profile FROM public.hr_job_profiles WHERE id = p_profile_id;
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  v_final_slug := COALESCE(p_slug, public.hr_slugify(COALESCE(p_title, v_profile.title_public)));

  -- Garantir slug único adicionando sufixo
  WHILE EXISTS (SELECT 1 FROM public.hr_jobs WHERE slug = v_final_slug) LOOP
    v_final_slug := v_final_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
  END LOOP;

  INSERT INTO public.hr_jobs (
    job_profile_id, title, slug, description, snapshot_profile,
    manager_member_id, status
  ) VALUES (
    p_profile_id,
    COALESCE(p_title, v_profile.title_public),
    v_final_slug,
    COALESCE(p_description, v_profile.mission),
    to_jsonb(v_profile),
    v_profile.manager_member_id,
    'draft'
  )
  RETURNING id INTO v_job_id;

  -- Copiar stages do profile
  FOR v_stage IN SELECT * FROM jsonb_array_elements(v_profile.default_stages)
  LOOP
    INSERT INTO public.hr_pipeline_stages (
      job_id, name, order_index, color, is_terminal_success, is_terminal_rejection
    ) VALUES (
      v_job_id,
      v_stage->>'name',
      (v_stage->>'order')::INT,
      COALESCE(v_stage->>'color', '#94a3b8'),
      COALESCE((v_stage->>'is_terminal_success')::BOOLEAN, false),
      COALESCE((v_stage->>'is_terminal_rejection')::BOOLEAN, false)
    );
  END LOOP;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_create_job_from_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 20. SEED inicial: extensão unaccent para slug
-- ═══════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS unaccent;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM DA MIGRATION
-- ═══════════════════════════════════════════════════════════════════════════
