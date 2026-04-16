-- ═══════════════════════════════════════════════════════════════════════════
-- HR — Obrigatoriedade configurável dos campos do formulário público
-- ───────────────────────────────────────────────────────────────────────────
-- Adiciona coluna JSONB em hr_job_profiles que armazena quais campos do
-- formulário público (TrabalheConoscoPage) são obrigatórios por vaga.
--
-- Keys suportadas (default entre parênteses):
--   full_name                 (true)
--   email                     (true)
--   phone                     (true)
--   city                      (false)
--   state                     (false)
--   portfolio_url             (false)
--   presential_availability   (true)
--   tools_known               (false)
--   salary_expectation        (false)
--   start_availability        (true)
--   experience_years          (false)
--   experience_summary        (false)
--   why_petron                (false)
--   accept_lgpd               (true)
--   resume                    (false — quando true força upload; complementa
--                              o flag legado `requires_experience` que força
--                              quando a vaga exige portfólio/experiência)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.hr_job_profiles
  ADD COLUMN IF NOT EXISTS field_requirements JSONB NOT NULL DEFAULT jsonb_build_object(
    'full_name', true,
    'email', true,
    'phone', true,
    'city', false,
    'state', false,
    'portfolio_url', false,
    'presential_availability', true,
    'tools_known', false,
    'salary_expectation', false,
    'start_availability', true,
    'experience_years', false,
    'experience_summary', false,
    'why_petron', false,
    'accept_lgpd', true,
    'resume', false
  );

COMMENT ON COLUMN public.hr_job_profiles.field_requirements IS
  'Flags por campo do formulário público controlando obrigatoriedade (UX + validação server-side).';

-- Backfill: aplica o default em linhas existentes que venham com {} (em tese
-- não existe porque NOT NULL DEFAULT já trata, mas garantia extra).
UPDATE public.hr_job_profiles
SET field_requirements = jsonb_build_object(
  'full_name', true,
  'email', true,
  'phone', true,
  'city', false,
  'state', false,
  'portfolio_url', false,
  'presential_availability', true,
  'tools_known', false,
  'salary_expectation', false,
  'start_availability', true,
  'experience_years', false,
  'experience_summary', false,
  'why_petron', false,
  'accept_lgpd', true,
  'resume', false
)
WHERE field_requirements IS NULL OR field_requirements = '{}'::jsonb;

-- ─── RPC pública hr_get_public_profiles: expor field_requirements ─────────
-- Recria a função incluindo field_requirements no retorno.

CREATE OR REPLACE FUNCTION public.hr_get_public_profiles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title_public', title_public,
      'department', department,
      'seniority', seniority,
      'contract_type', contract_type,
      'modality', modality,
      'base_city', base_city,
      'mission', mission,
      'short_pitch', short_pitch,
      'deliverables', deliverables,
      'skills', skills,
      'tools', tools,
      'requirements', requirements,
      'salary_range', salary_range,
      'requires_experience', requires_experience,
      'field_requirements', field_requirements
    )
    ORDER BY
      CASE seniority
        WHEN 'estagio' THEN 1
        WHEN 'junior' THEN 2
        WHEN 'pleno' THEN 3
        WHEN 'senior' THEN 4
        WHEN 'especialista' THEN 5
        WHEN 'lideranca' THEN 6
        ELSE 7
      END,
      title_public
  )
  INTO result
  FROM public.hr_job_profiles
  WHERE accepting_applications = true AND status = 'active';

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_get_public_profiles() TO anon, authenticated;
