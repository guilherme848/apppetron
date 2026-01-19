-- 1) Tabela de cargos (job_roles)
CREATE TABLE public.job_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

-- RLS policy for job_roles
CREATE POLICY "Allow all access to job_roles"
ON public.job_roles FOR ALL
USING (true)
WITH CHECK (true);

-- Seed inicial: Designer e Videomaker
INSERT INTO public.job_roles (name) VALUES ('Designer'), ('Videomaker');

-- 2) Tabela de responsáveis por etapa do pipeline
CREATE TABLE public.content_stage_responsibilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key TEXT NOT NULL UNIQUE,
  role_id UUID REFERENCES public.job_roles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_stage_responsibilities ENABLE ROW LEVEL SECURITY;

-- RLS policy for content_stage_responsibilities
CREATE POLICY "Allow all access to content_stage_responsibilities"
ON public.content_stage_responsibilities FOR ALL
USING (true)
WITH CHECK (true);

-- Seed das etapas (production e changes sem role fixo)
INSERT INTO public.content_stage_responsibilities (stage_key, role_id) VALUES
  ('planning', NULL),
  ('production', NULL),
  ('review', NULL),
  ('pdf', NULL),
  ('to_deliver', NULL),
  ('delivered', NULL),
  ('changes', NULL),
  ('scheduling', NULL);

-- 3) Adicionar colunas em content_posts
ALTER TABLE public.content_posts 
  ADD COLUMN IF NOT EXISTS item_type TEXT,
  ADD COLUMN IF NOT EXISTS responsible_role_id UUID REFERENCES public.job_roles(id) ON DELETE SET NULL;