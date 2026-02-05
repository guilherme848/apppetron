-- =====================================================
-- TRAFFIC PLAYBOOK SYSTEM - New Data Model
-- =====================================================

-- 1. Create enum types for the new system
CREATE TYPE traffic_cadence AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly');
CREATE TYPE traffic_anchor_rule AS ENUM ('weekday', 'biweekly_days', 'month_day', 'quarter_day');
CREATE TYPE traffic_task_status AS ENUM ('todo', 'doing', 'blocked', 'done', 'skipped');
CREATE TYPE traffic_campaign_status AS ENUM ('active', 'paused', 'no_budget', 'onboarding', 'waiting_creatives');

-- 2. Traffic Playbook Templates (linked to service/plan)
CREATE TABLE public.traffic_playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT, -- markdown supported
  checklist JSONB DEFAULT '[]'::jsonb, -- array of checklist items
  cadence traffic_cadence NOT NULL,
  anchor_rule traffic_anchor_rule,
  anchor_day_of_week INT CHECK (anchor_day_of_week >= 0 AND anchor_day_of_week <= 6), -- 0=Sunday, 6=Saturday
  anchor_day_of_month INT CHECK (anchor_day_of_month >= 1 AND anchor_day_of_month <= 28),
  offset_days INT DEFAULT 0,
  default_owner_role TEXT DEFAULT 'traffic', -- role_key for auto-assignment
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  sort_order INT DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Traffic Playbook Overrides (per-client customization)
CREATE TABLE public.traffic_playbook_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.traffic_playbook_templates(id) ON DELETE CASCADE NOT NULL,
  is_disabled BOOLEAN DEFAULT false,
  owner_override UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  cadence_override traffic_cadence,
  notes_override TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, template_id)
);

-- 4. Traffic Playbook Tasks (generated tasks)
CREATE TABLE public.traffic_playbook_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.traffic_playbook_templates(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE,
  title TEXT NOT NULL,
  description TEXT,
  checklist JSONB DEFAULT '[]'::jsonb, -- copied from template, can be modified
  status traffic_task_status DEFAULT 'todo',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  cadence traffic_cadence,
  due_date DATE NOT NULL,
  assigned_to UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  evidence_links JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(client_id, template_id, period_start)
);

-- 5. Traffic Client Status (operational status per client)
CREATE TABLE public.traffic_client_status (
  client_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE PRIMARY KEY,
  campaign_status traffic_campaign_status DEFAULT 'active',
  notes TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES public.team_members(id) ON DELETE SET NULL
);

-- 6. Create indexes for performance
CREATE INDEX idx_traffic_playbook_templates_service ON public.traffic_playbook_templates(service_id);
CREATE INDEX idx_traffic_playbook_templates_cadence ON public.traffic_playbook_templates(cadence);
CREATE INDEX idx_traffic_playbook_templates_active ON public.traffic_playbook_templates(active);

CREATE INDEX idx_traffic_playbook_overrides_client ON public.traffic_playbook_overrides(client_id);
CREATE INDEX idx_traffic_playbook_overrides_template ON public.traffic_playbook_overrides(template_id);

CREATE INDEX idx_traffic_playbook_tasks_client ON public.traffic_playbook_tasks(client_id);
CREATE INDEX idx_traffic_playbook_tasks_template ON public.traffic_playbook_tasks(template_id);
CREATE INDEX idx_traffic_playbook_tasks_due_date ON public.traffic_playbook_tasks(due_date);
CREATE INDEX idx_traffic_playbook_tasks_status ON public.traffic_playbook_tasks(status);
CREATE INDEX idx_traffic_playbook_tasks_assigned ON public.traffic_playbook_tasks(assigned_to);

-- 7. Enable RLS
ALTER TABLE public.traffic_playbook_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_playbook_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_playbook_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_client_status ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies for templates (admin/managers can edit, all authenticated can view)
CREATE POLICY "Authenticated users can view templates"
ON public.traffic_playbook_templates FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage templates"
ON public.traffic_playbook_templates FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 9. RLS Policies for overrides
CREATE POLICY "Authenticated users can view overrides"
ON public.traffic_playbook_overrides FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage overrides"
ON public.traffic_playbook_overrides FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 10. RLS Policies for tasks (team members can manage their assigned tasks)
CREATE POLICY "Authenticated users can view tasks"
ON public.traffic_playbook_tasks FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can update tasks"
ON public.traffic_playbook_tasks FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Admins can manage all tasks"
ON public.traffic_playbook_tasks FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "System can insert tasks"
ON public.traffic_playbook_tasks FOR INSERT
TO authenticated
WITH CHECK (true);

-- 11. RLS Policies for client status
CREATE POLICY "Authenticated users can view client status"
ON public.traffic_client_status FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Team members can update client status"
ON public.traffic_client_status FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Team members can insert client status"
ON public.traffic_client_status FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Admins can manage client status"
ON public.traffic_client_status FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 12. Trigger for updated_at
CREATE TRIGGER update_traffic_playbook_templates_updated_at
BEFORE UPDATE ON public.traffic_playbook_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traffic_playbook_overrides_updated_at
BEFORE UPDATE ON public.traffic_playbook_overrides
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traffic_playbook_tasks_updated_at
BEFORE UPDATE ON public.traffic_playbook_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Function to auto-assign tasks based on client's account team
CREATE OR REPLACE FUNCTION public.trg_traffic_playbook_tasks_auto_assign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_role_key TEXT;
BEGIN
  -- Get the default owner role from template if template_id exists
  IF NEW.template_id IS NOT NULL THEN
    SELECT default_owner_role INTO v_role_key
    FROM public.traffic_playbook_templates
    WHERE id = NEW.template_id;
  END IF;
  
  -- Default to 'traffic' if no role found
  v_role_key := COALESCE(v_role_key, 'traffic');
  
  -- Resolve assignee from account team if not already set
  IF NEW.assigned_to IS NULL THEN
    NEW.assigned_to := public.resolve_assignee_from_account_team(NEW.client_id, v_role_key);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_traffic_playbook_tasks_auto_assign
BEFORE INSERT ON public.traffic_playbook_tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_traffic_playbook_tasks_auto_assign();

-- 14. Function to set completed_at when status changes to done
CREATE OR REPLACE FUNCTION public.trg_traffic_playbook_tasks_lifecycle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'done' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := NOW();
    ELSIF NEW.status != 'done' THEN
      NEW.completed_at := NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_traffic_playbook_tasks_lifecycle
BEFORE UPDATE ON public.traffic_playbook_tasks
FOR EACH ROW EXECUTE FUNCTION public.trg_traffic_playbook_tasks_lifecycle();

-- 15. Mark old traffic tables as legacy (add comment, don't delete yet)
COMMENT ON TABLE public.traffic_routines IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_routine_cycles IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_cycles IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_cycle_routines IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_routine_tasks IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_cycle_tasks IS 'LEGACY - Replaced by traffic_playbook_templates';
COMMENT ON TABLE public.traffic_periods IS 'LEGACY - Replaced by traffic_playbook_tasks';
COMMENT ON TABLE public.traffic_tasks IS 'LEGACY - Replaced by traffic_playbook_tasks';