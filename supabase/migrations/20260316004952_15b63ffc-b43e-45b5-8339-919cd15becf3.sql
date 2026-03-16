
-- =============================================
-- 1) ONBOARDINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.onboardings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cs_owner_id uuid REFERENCES public.team_members(id),
  traffic_owner_id uuid REFERENCES public.team_members(id),
  status text NOT NULL DEFAULT 'em_andamento',
  transcricao_reuniao_vendas text,
  data_inicio date DEFAULT CURRENT_DATE,
  data_conclusao date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: only one active onboarding per client
CREATE UNIQUE INDEX idx_onboardings_active_client 
  ON public.onboardings (client_id) 
  WHERE status = 'em_andamento';

-- Updated_at trigger
CREATE TRIGGER set_onboardings_updated_at
  BEFORE UPDATE ON public.onboardings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.onboardings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view onboardings"
  ON public.onboardings FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert onboardings"
  ON public.onboardings FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboardings"
  ON public.onboardings FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete onboardings"
  ON public.onboardings FOR DELETE TO authenticated
  USING (true);

-- =============================================
-- 2) ONBOARDING_ATIVIDADES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.onboarding_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.onboardings(id) ON DELETE CASCADE,
  atividade_template_id uuid REFERENCES public.petron_onboarding_activity_templates(id),
  titulo text NOT NULL,
  descricao text,
  responsavel_perfil text, -- 'cs' | 'trafego'
  responsavel_id uuid REFERENCES public.team_members(id),
  status text NOT NULL DEFAULT 'pendente',
  ordem integer DEFAULT 0,
  data_conclusao timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.onboarding_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view onboarding_atividades"
  ON public.onboarding_atividades FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert onboarding_atividades"
  ON public.onboarding_atividades FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboarding_atividades"
  ON public.onboarding_atividades FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete onboarding_atividades"
  ON public.onboarding_atividades FOR DELETE TO authenticated
  USING (true);

-- =============================================
-- 3) ONBOARDING_REUNIAO_RESPOSTAS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS public.onboarding_reuniao_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid NOT NULL REFERENCES public.onboardings(id) ON DELETE CASCADE,
  pergunta_id uuid REFERENCES public.cs_onboarding_questions(id),
  resposta text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Unique constraint: one answer per question per onboarding
CREATE UNIQUE INDEX idx_onboarding_resposta_unique 
  ON public.onboarding_reuniao_respostas (onboarding_id, pergunta_id);

CREATE TRIGGER set_onboarding_respostas_updated_at
  BEFORE UPDATE ON public.onboarding_reuniao_respostas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.onboarding_reuniao_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view onboarding_reuniao_respostas"
  ON public.onboarding_reuniao_respostas FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert onboarding_reuniao_respostas"
  ON public.onboarding_reuniao_respostas FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update onboarding_reuniao_respostas"
  ON public.onboarding_reuniao_respostas FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete onboarding_reuniao_respostas"
  ON public.onboarding_reuniao_respostas FOR DELETE TO authenticated
  USING (true);

-- =============================================
-- 4) RPC: Generate activities from templates
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_onboarding_atividades(p_onboarding_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_template RECORD;
  v_count integer := 0;
  v_order integer := 1;
BEGIN
  -- Delete existing activities for this onboarding
  DELETE FROM public.onboarding_atividades WHERE onboarding_id = p_onboarding_id;

  -- Copy all active templates as activities
  FOR v_template IN
    SELECT id, title, description, default_owner_role
    FROM public.petron_onboarding_activity_templates
    WHERE active = true
    ORDER BY title
  LOOP
    INSERT INTO public.onboarding_atividades (
      onboarding_id,
      atividade_template_id,
      titulo,
      descricao,
      responsavel_perfil,
      status,
      ordem
    ) VALUES (
      p_onboarding_id,
      v_template.id,
      v_template.title,
      v_template.description,
      v_template.default_owner_role,
      'pendente',
      v_order
    );
    v_order := v_order + 1;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- =============================================
-- 5) RPC: Complete onboarding (mark all pending activities as done)
-- =============================================
CREATE OR REPLACE FUNCTION public.complete_onboarding(p_onboarding_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Mark all pending activities as completed
  UPDATE public.onboarding_atividades
  SET status = 'concluida', data_conclusao = now()
  WHERE onboarding_id = p_onboarding_id AND status = 'pendente';

  -- Mark onboarding as completed
  UPDATE public.onboardings
  SET status = 'concluido', data_conclusao = CURRENT_DATE, updated_at = now()
  WHERE id = p_onboarding_id;
END;
$$;
