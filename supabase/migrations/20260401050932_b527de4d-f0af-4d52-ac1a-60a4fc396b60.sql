
-- 1. Create stage templates table
CREATE TABLE IF NOT EXISTS public.onboarding_etapas_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem integer NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_etapas_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view onboarding stage templates" ON public.onboarding_etapas_template FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage onboarding stage templates" ON public.onboarding_etapas_template FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Create activity templates table (new, separate from petron_onboarding_activity_templates)
CREATE TABLE IF NOT EXISTS public.onboarding_atividades_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etapa_id uuid NOT NULL REFERENCES public.onboarding_etapas_template(id) ON DELETE CASCADE,
  ordem integer NOT NULL,
  nome text NOT NULL,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_atividades_template ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view onboarding activity templates" ON public.onboarding_atividades_template FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage onboarding activity templates" ON public.onboarding_atividades_template FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Delete ALL existing onboarding activity instances
DELETE FROM public.onboarding_atividades;

-- 4. Add etapa_id column to onboarding_atividades
ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS etapa_id uuid REFERENCES public.onboarding_etapas_template(id);
ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS new_template_id uuid REFERENCES public.onboarding_atividades_template(id);

-- 5. Deactivate ALL old petron templates
UPDATE public.petron_onboarding_activity_templates SET active = false;

-- 6. Insert 3 stages
INSERT INTO public.onboarding_etapas_template (id, ordem, nome) VALUES
  ('a1000001-0000-0000-0000-000000000001', 1, 'Primeiros Passos'),
  ('a1000001-0000-0000-0000-000000000002', 2, 'BM'),
  ('a1000001-0000-0000-0000-000000000003', 3, 'Campanha');

-- 7. Insert 21 activities in exact order
INSERT INTO public.onboarding_atividades_template (etapa_id, ordem, nome) VALUES
  -- ETAPA 1 - PRIMEIROS PASSOS
  ('a1000001-0000-0000-0000-000000000001', 1, 'Reunião de Onboarding'),
  ('a1000001-0000-0000-0000-000000000001', 2, 'Criar Grupo no WhatsApp'),
  ('a1000001-0000-0000-0000-000000000001', 3, 'Enviar Mensagem de Boas Vindas'),
  ('a1000001-0000-0000-0000-000000000001', 4, 'Coleta de Acessos'),
  ('a1000001-0000-0000-0000-000000000001', 5, 'Atualizar Cadastro do Cliente'),
  ('a1000001-0000-0000-0000-000000000001', 6, 'Solicitar Identidade Visual'),
  ('a1000001-0000-0000-0000-000000000001', 7, 'Criar Pasta Drive'),
  -- ETAPA 2 - BM
  ('a1000001-0000-0000-0000-000000000002', 1, 'Criar/Configurar BM'),
  ('a1000001-0000-0000-0000-000000000002', 2, 'Criar/Configurar Gerenciador de Anúncios'),
  ('a1000001-0000-0000-0000-000000000002', 3, 'Vincular WhatsApp'),
  ('a1000001-0000-0000-0000-000000000002', 4, 'Vincular Instagram'),
  ('a1000001-0000-0000-0000-000000000002', 5, 'Configurar Pagamento'),
  ('a1000001-0000-0000-0000-000000000002', 6, 'Adicionar Saldo'),
  ('a1000001-0000-0000-0000-000000000002', 7, 'Criar Reportei'),
  ('a1000001-0000-0000-0000-000000000002', 8, 'Configurar Automação Reportei'),
  -- ETAPA 3 - CAMPANHA
  ('a1000001-0000-0000-0000-000000000003', 1, 'Solicitação de Ofertas'),
  ('a1000001-0000-0000-0000-000000000003', 2, 'Criação de Criativos'),
  ('a1000001-0000-0000-0000-000000000003', 3, 'Criação de Públicos'),
  ('a1000001-0000-0000-0000-000000000003', 4, 'Aprovação Criativos'),
  ('a1000001-0000-0000-0000-000000000003', 5, 'Criação de Campanha'),
  ('a1000001-0000-0000-0000-000000000003', 6, 'Ativar Automação Reportei');

-- 8. Replace the generate function to use new tables
CREATE OR REPLACE FUNCTION public.generate_onboarding_atividades(p_onboarding_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template RECORD;
  v_count integer := 0;
  v_global_order integer := 1;
BEGIN
  -- Delete existing activities for this onboarding
  DELETE FROM public.onboarding_atividades WHERE onboarding_id = p_onboarding_id;

  -- Generate from new template tables, ordered by stage then activity order
  FOR v_template IN
    SELECT
      at.id AS template_id,
      at.nome,
      at.ordem AS atividade_ordem,
      et.id AS etapa_id,
      et.ordem AS etapa_ordem
    FROM public.onboarding_atividades_template at
    JOIN public.onboarding_etapas_template et ON et.id = at.etapa_id
    WHERE at.ativo = true AND et.ativo = true
    ORDER BY et.ordem, at.ordem
  LOOP
    INSERT INTO public.onboarding_atividades (
      onboarding_id,
      new_template_id,
      etapa_id,
      titulo,
      status,
      ordem,
      etapa
    ) VALUES (
      p_onboarding_id,
      v_template.template_id,
      v_template.etapa_id,
      v_template.nome,
      'pendente',
      v_global_order,
      v_template.etapa_ordem
    );
    v_global_order := v_global_order + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
