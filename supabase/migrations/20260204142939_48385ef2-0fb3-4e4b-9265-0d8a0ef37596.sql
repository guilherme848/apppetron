-- =============================================
-- PETRON ONBOARDING SYSTEM - DATABASE SCHEMA
-- =============================================

-- 1) PETRON PLANS (Planos)
CREATE TABLE public.petron_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) ACTIVITY TEMPLATES (Atividades-Template)
CREATE TABLE public.petron_onboarding_activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  default_owner_role TEXT NOT NULL DEFAULT 'cs',
  default_sla_days INTEGER NOT NULL DEFAULT 1 CHECK (default_sla_days >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3) SEQUENCES (Sequência por Plano)
CREATE TABLE public.petron_onboarding_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.petron_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4) SEQUENCE STEPS (Passos da Sequência)
CREATE TABLE public.petron_onboarding_sequence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id UUID NOT NULL REFERENCES public.petron_onboarding_sequences(id) ON DELETE CASCADE,
  activity_template_id UUID NOT NULL REFERENCES public.petron_onboarding_activity_templates(id) ON DELETE RESTRICT,
  step_order INTEGER NOT NULL DEFAULT 0,
  offset_days INTEGER CHECK (offset_days IS NULL OR offset_days >= 0),
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, step_order)
);

-- 5) CUSTOMER ONBOARDINGS (Onboarding do Cliente)
CREATE TYPE public.petron_onboarding_status AS ENUM ('draft', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.petron_customer_onboardings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.petron_plans(id) ON DELETE RESTRICT,
  sequence_id UUID REFERENCES public.petron_onboarding_sequences(id) ON DELETE SET NULL,
  status public.petron_onboarding_status NOT NULL DEFAULT 'draft',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) ONBOARDING TASKS (Tarefas Geradas)
CREATE TYPE public.petron_task_status AS ENUM ('todo', 'doing', 'blocked', 'done');

CREATE TABLE public.petron_onboarding_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID NOT NULL REFERENCES public.petron_customer_onboardings(id) ON DELETE CASCADE,
  activity_template_id UUID REFERENCES public.petron_onboarding_activity_templates(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL DEFAULT 0,
  due_date DATE,
  status public.petron_task_status NOT NULL DEFAULT 'todo',
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX idx_petron_sequences_plan ON public.petron_onboarding_sequences(plan_id);
CREATE INDEX idx_petron_steps_sequence ON public.petron_onboarding_sequence_steps(sequence_id);
CREATE INDEX idx_petron_customer_onboardings_customer ON public.petron_customer_onboardings(customer_id);
CREATE INDEX idx_petron_customer_onboardings_status ON public.petron_customer_onboardings(status);
CREATE INDEX idx_petron_tasks_onboarding ON public.petron_onboarding_tasks(onboarding_id);
CREATE INDEX idx_petron_tasks_status ON public.petron_onboarding_tasks(status);
CREATE INDEX idx_petron_tasks_assigned ON public.petron_onboarding_tasks(assigned_to);

-- =============================================
-- TRIGGERS FOR updated_at
-- =============================================
CREATE TRIGGER update_petron_plans_updated_at
  BEFORE UPDATE ON public.petron_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petron_activity_templates_updated_at
  BEFORE UPDATE ON public.petron_onboarding_activity_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petron_sequences_updated_at
  BEFORE UPDATE ON public.petron_onboarding_sequences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petron_customer_onboardings_updated_at
  BEFORE UPDATE ON public.petron_customer_onboardings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petron_tasks_updated_at
  BEFORE UPDATE ON public.petron_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.petron_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_onboarding_activity_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_onboarding_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_onboarding_sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_customer_onboardings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petron_onboarding_tasks ENABLE ROW LEVEL SECURITY;

-- Configuration tables: admin/ops_manager can manage, others can view
-- Using is_admin function for admin check, and checking job_roles for ops_manager

-- petron_plans policies
CREATE POLICY "Authenticated users can view petron_plans"
  ON public.petron_plans FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage petron_plans"
  ON public.petron_plans FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- petron_onboarding_activity_templates policies
CREATE POLICY "Authenticated users can view activity_templates"
  ON public.petron_onboarding_activity_templates FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage activity_templates"
  ON public.petron_onboarding_activity_templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- petron_onboarding_sequences policies
CREATE POLICY "Authenticated users can view sequences"
  ON public.petron_onboarding_sequences FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sequences"
  ON public.petron_onboarding_sequences FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- petron_onboarding_sequence_steps policies
CREATE POLICY "Authenticated users can view sequence_steps"
  ON public.petron_onboarding_sequence_steps FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sequence_steps"
  ON public.petron_onboarding_sequence_steps FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- petron_customer_onboardings policies (cs_user can create/view, admin full access)
CREATE POLICY "Authenticated users can view customer_onboardings"
  ON public.petron_customer_onboardings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create customer_onboardings"
  ON public.petron_customer_onboardings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage customer_onboardings"
  ON public.petron_customer_onboardings FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update own team onboardings"
  ON public.petron_customer_onboardings FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- petron_onboarding_tasks policies (cs_user can update assigned tasks)
CREATE POLICY "Authenticated users can view tasks"
  ON public.petron_onboarding_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.petron_onboarding_tasks FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update tasks"
  ON public.petron_onboarding_tasks FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage tasks"
  ON public.petron_onboarding_tasks FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- =============================================
-- FUNCTION: Generate onboarding tasks from sequence
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_petron_onboarding_tasks(
  p_onboarding_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding RECORD;
  v_step RECORD;
  v_task_count INTEGER := 0;
  v_due_date DATE;
BEGIN
  -- Get onboarding details
  SELECT * INTO v_onboarding
  FROM petron_customer_onboardings
  WHERE id = p_onboarding_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Onboarding not found: %', p_onboarding_id;
  END IF;

  IF v_onboarding.sequence_id IS NULL THEN
    -- Get active sequence for the plan
    SELECT id INTO v_onboarding.sequence_id
    FROM petron_onboarding_sequences
    WHERE plan_id = v_onboarding.plan_id AND active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_onboarding.sequence_id IS NULL THEN
      RAISE EXCEPTION 'No active sequence found for plan';
    END IF;

    -- Update onboarding with sequence
    UPDATE petron_customer_onboardings
    SET sequence_id = v_onboarding.sequence_id
    WHERE id = p_onboarding_id;
  END IF;

  -- Generate tasks from sequence steps
  FOR v_step IN
    SELECT 
      ss.*,
      at.title,
      at.description,
      at.default_owner_role,
      at.default_sla_days
    FROM petron_onboarding_sequence_steps ss
    JOIN petron_onboarding_activity_templates at ON at.id = ss.activity_template_id
    WHERE ss.sequence_id = v_onboarding.sequence_id
    ORDER BY ss.step_order
  LOOP
    -- Calculate due date: start_date + offset_days (or default_sla_days if offset is null)
    v_due_date := v_onboarding.start_date + COALESCE(v_step.offset_days, v_step.default_sla_days);

    INSERT INTO petron_onboarding_tasks (
      onboarding_id,
      activity_template_id,
      title,
      description,
      step_order,
      due_date,
      status
    ) VALUES (
      p_onboarding_id,
      v_step.activity_template_id,
      v_step.title,
      v_step.description,
      v_step.step_order,
      v_due_date,
      'todo'
    );

    v_task_count := v_task_count + 1;
  END LOOP;

  -- Update onboarding status to in_progress
  UPDATE petron_customer_onboardings
  SET status = 'in_progress'
  WHERE id = p_onboarding_id;

  RETURN v_task_count;
END;
$$;