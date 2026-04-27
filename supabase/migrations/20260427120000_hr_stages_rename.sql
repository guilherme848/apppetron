-- Renomeia etapas do pipeline de RH para o novo padrão Petron:
--   Análise de Currículo   → Análise do Candidato
--   Envio do Formulário    → Agendar Entrevista
--   Entrevista 1           → Entrevista 001
--   Desafio                → Teste Comportamental
--   Entrevista 2           → Entrevista 002
--   Decisão                → (mantém)
--
-- Atualiza:
--  1. DEFAULT da coluna hr_job_profiles.default_stages (novos perfis)
--  2. JSONB default_stages dos perfis existentes (mapeamento por nome)
--  3. Linhas em hr_pipeline_stages (vagas já criadas) — preserva IDs

BEGIN;

-- 1. Novo DEFAULT pra perfis criados a partir de agora
ALTER TABLE public.hr_job_profiles
  ALTER COLUMN default_stages SET DEFAULT '[
    {"name":"Análise do Candidato","order":0,"color":"#94a3b8","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Agendar Entrevista","order":1,"color":"#3b82f6","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Entrevista 001","order":2,"color":"#f59e0b","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Teste Comportamental","order":3,"color":"#a855f7","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Entrevista 002","order":4,"color":"#f59e0b","is_terminal_success":false,"is_terminal_rejection":false},
    {"name":"Decisão","order":5,"color":"#10b981","is_terminal_success":true,"is_terminal_rejection":false}
  ]'::jsonb;

-- 2. Renomear nos perfis existentes (default_stages JSONB)
WITH remapped AS (
  SELECT
    id,
    (
      SELECT jsonb_agg(
        CASE elem->>'name'
          WHEN 'Análise de Currículo' THEN jsonb_set(elem, '{name}', '"Análise do Candidato"'::jsonb)
          WHEN 'Envio do Formulário'  THEN jsonb_set(elem, '{name}', '"Agendar Entrevista"'::jsonb)
          WHEN 'Entrevista 1'         THEN jsonb_set(elem, '{name}', '"Entrevista 001"'::jsonb)
          WHEN 'Desafio'              THEN jsonb_set(elem, '{name}', '"Teste Comportamental"'::jsonb)
          WHEN 'Entrevista 2'         THEN jsonb_set(elem, '{name}', '"Entrevista 002"'::jsonb)
          ELSE elem
        END
        ORDER BY (elem->>'order')::int
      )
      FROM jsonb_array_elements(default_stages) elem
    ) AS new_stages
  FROM public.hr_job_profiles
)
UPDATE public.hr_job_profiles p
SET default_stages = r.new_stages,
    updated_at = now()
FROM remapped r
WHERE p.id = r.id
  AND r.new_stages IS DISTINCT FROM p.default_stages;

-- 3. Renomear nas vagas já criadas (hr_pipeline_stages — preserva IDs)
UPDATE public.hr_pipeline_stages
SET name = CASE name
    WHEN 'Análise de Currículo' THEN 'Análise do Candidato'
    WHEN 'Envio do Formulário'  THEN 'Agendar Entrevista'
    WHEN 'Entrevista 1'         THEN 'Entrevista 001'
    WHEN 'Desafio'              THEN 'Teste Comportamental'
    WHEN 'Entrevista 2'         THEN 'Entrevista 002'
    ELSE name
  END
WHERE name IN (
  'Análise de Currículo',
  'Envio do Formulário',
  'Entrevista 1',
  'Desafio',
  'Entrevista 2'
);

COMMIT;
