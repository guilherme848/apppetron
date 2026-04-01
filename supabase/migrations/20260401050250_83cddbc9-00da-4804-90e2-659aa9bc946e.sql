
-- 1. Add etapa column to templates and activities
ALTER TABLE public.petron_onboarding_activity_templates ADD COLUMN IF NOT EXISTS etapa integer;

ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS etapa integer;
ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS delegado_para_id uuid REFERENCES public.team_members(id);
ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS delegado_por_id uuid REFERENCES public.team_members(id);
ALTER TABLE public.onboarding_atividades ADD COLUMN IF NOT EXISTS delegado_em timestamptz;

-- 2. Deactivate all old templates
UPDATE public.petron_onboarding_activity_templates SET active = false;

-- 3. Insert 21 new templates in 3 stages
INSERT INTO public.petron_onboarding_activity_templates (title, description, default_owner_role, etapa, default_sla_days, active) VALUES
-- ETAPA 1 - PRIMEIROS PASSOS
('Reunião de Onboarding', NULL, 'cs', 1, 1, true),
('Criar Grupo no WhatsApp', NULL, 'cs', 1, 1, true),
('Enviar Mensagem de Boas Vindas', NULL, 'cs', 1, 1, true),
('Coleta de Acessos', NULL, 'cs', 1, 2, true),
('Atualizar Cadastro do Cliente', NULL, 'cs', 1, 2, true),
('Solicitar Identidade Visual', NULL, 'cs', 1, 2, true),
('Criar Pasta Drive', NULL, 'cs', 1, 1, true),
-- ETAPA 2 - BM
('Criar/Configurar BM', NULL, 'cs', 2, 3, true),
('Criar/Configurar Gerenciador de Anúncios', NULL, 'cs', 2, 3, true),
('Vincular WhatsApp', NULL, 'cs', 2, 3, true),
('Vincular Instagram', NULL, 'cs', 2, 3, true),
('Configurar Pagamento', NULL, 'cs', 2, 3, true),
('Adicionar Saldo', NULL, 'cs', 2, 3, true),
('Criar Reportei', NULL, 'cs', 2, 4, true),
('Configurar Automação Reportei', NULL, 'cs', 2, 4, true),
-- ETAPA 3 - CAMPANHA
('Solicitação de Ofertas', NULL, 'cs', 3, 5, true),
('Criação de Criativos', NULL, 'cs', 3, 6, true),
('Criação de Públicos', NULL, 'cs', 3, 6, true),
('Aprovação Criativos', NULL, 'cs', 3, 7, true),
('Criação de Campanha', NULL, 'cs', 3, 8, true),
('Ativar Automação Reportei', NULL, 'cs', 3, 8, true);

-- 4. Update generate_onboarding_atividades to include etapa and order by etapa+title
CREATE OR REPLACE FUNCTION public.generate_onboarding_atividades(p_onboarding_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_template RECORD;
  v_count integer := 0;
  v_order integer := 1;
BEGIN
  DELETE FROM public.onboarding_atividades WHERE onboarding_id = p_onboarding_id;

  FOR v_template IN
    SELECT id, title, description, default_owner_role, etapa
    FROM public.petron_onboarding_activity_templates
    WHERE active = true
    ORDER BY COALESCE(etapa, 1), title
  LOOP
    INSERT INTO public.onboarding_atividades (
      onboarding_id,
      atividade_template_id,
      titulo,
      descricao,
      responsavel_perfil,
      status,
      ordem,
      etapa
    ) VALUES (
      p_onboarding_id,
      v_template.id,
      v_template.title,
      v_template.description,
      v_template.default_owner_role,
      'pendente',
      v_order,
      v_template.etapa
    );
    v_order := v_order + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;
