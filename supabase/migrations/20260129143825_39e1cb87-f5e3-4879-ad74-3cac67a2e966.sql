-- =============================================
-- CS COMMAND CENTER - SCHEMA ADDITIONS
-- =============================================

-- 1. Playbooks table for action plans
CREATE TABLE IF NOT EXISTS public.cs_playbooks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('detractor', 'onboarding_delayed', 'critical', 'no_meeting', 'churn_prevention', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  responsible_member_id UUID REFERENCES public.team_members(id),
  due_at TIMESTAMP WITH TIME ZONE,
  notes_rich TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Playbook tasks
CREATE TABLE IF NOT EXISTS public.cs_playbook_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES public.cs_playbooks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_rich TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  assignee_member_id UUID REFERENCES public.team_members(id),
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Client health score history
CREATE TABLE IF NOT EXISTS public.cs_client_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'attention', 'critical')),
  signals JSONB NOT NULL DEFAULT '[]',
  main_reason TEXT,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Add health_score and origin to accounts if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'health_score') THEN
    ALTER TABLE public.accounts ADD COLUMN health_score INTEGER DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'health_status') THEN
    ALTER TABLE public.accounts ADD COLUMN health_status TEXT DEFAULT 'healthy';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'origin') THEN
    ALTER TABLE public.accounts ADD COLUMN origin TEXT DEFAULT 'other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'accounts' AND column_name = 'last_contact_at') THEN
    ALTER TABLE public.accounts ADD COLUMN last_contact_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 5. Churn events enriched table
CREATE TABLE IF NOT EXISTS public.cs_churn_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cancel_date DATE NOT NULL,
  reason TEXT NOT NULL,
  sub_reason TEXT,
  mrr_lost NUMERIC NOT NULL DEFAULT 0,
  retention_attempted BOOLEAN NOT NULL DEFAULT false,
  retention_result TEXT CHECK (retention_result IN ('retained', 'not_retained', NULL)),
  retention_offer TEXT,
  notes_rich TEXT,
  owner_member_id UUID REFERENCES public.team_members(id),
  previous_nps INTEGER,
  lifetime_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. CS Alert configurations
CREATE TABLE IF NOT EXISTS public.cs_alert_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold_days INTEGER,
  threshold_value INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default alert configs
INSERT INTO public.cs_alert_config (alert_type, enabled, threshold_days) VALUES
  ('detractor_no_contact', true, 2),
  ('onboarding_stalled', true, 7),
  ('critical_no_playbook', true, 1),
  ('meeting_overdue', true, 30),
  ('task_sla_breached', true, 1)
ON CONFLICT (alert_type) DO NOTHING;

-- 7. Health score weight configuration
CREATE TABLE IF NOT EXISTS public.cs_health_weights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  signal_key TEXT NOT NULL UNIQUE,
  signal_label TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  threshold_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default health weights
INSERT INTO public.cs_health_weights (signal_key, signal_label, weight, threshold_days) VALUES
  ('onboarding_delayed', 'Onboarding Atrasado', 25, 14),
  ('tasks_overdue', 'Tarefas Vencidas', 20, NULL),
  ('no_meeting', 'Sem Reunião Recente', 20, 30),
  ('detractor_no_followup', 'Detrator sem Follow-up', 25, 2),
  ('low_nps', 'NPS Baixo', 10, NULL)
ON CONFLICT (signal_key) DO NOTHING;

-- Enable RLS on all new tables
ALTER TABLE public.cs_playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_playbook_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_client_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_churn_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_alert_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_health_weights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to cs_playbooks" ON public.cs_playbooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_playbook_tasks" ON public.cs_playbook_tasks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_client_health_scores" ON public.cs_client_health_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_churn_events" ON public.cs_churn_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_alert_config" ON public.cs_alert_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_health_weights" ON public.cs_health_weights FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cs_playbooks_client ON public.cs_playbooks(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_playbooks_status ON public.cs_playbooks(status);
CREATE INDEX IF NOT EXISTS idx_cs_client_health_scores_client ON public.cs_client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_churn_events_client ON public.cs_churn_events(client_id);
CREATE INDEX IF NOT EXISTS idx_cs_churn_events_date ON public.cs_churn_events(cancel_date);
CREATE INDEX IF NOT EXISTS idx_accounts_health ON public.accounts(health_status);
CREATE INDEX IF NOT EXISTS idx_accounts_origin ON public.accounts(origin);