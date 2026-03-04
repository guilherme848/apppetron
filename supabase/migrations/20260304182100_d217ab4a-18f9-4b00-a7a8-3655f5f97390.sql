
-- Lead Scoring Config
CREATE TABLE public.crm_scoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL,
  group_label TEXT NOT NULL,
  criterion_key TEXT NOT NULL UNIQUE,
  criterion_label TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_scoring_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read scoring config" ON public.crm_scoring_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage scoring config" ON public.crm_scoring_config FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Deal Scores
CREATE TABLE public.crm_deal_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  breakdown JSONB NOT NULL DEFAULT '{}',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deal_scores_deal ON public.crm_deal_scores(deal_id);
CREATE INDEX idx_deal_scores_score ON public.crm_deal_scores(score DESC);

ALTER TABLE public.crm_deal_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read deal scores" ON public.crm_deal_scores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert deal scores" ON public.crm_deal_scores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update deal scores" ON public.crm_deal_scores FOR UPDATE TO authenticated USING (true);

-- Templates
CREATE TABLE public.crm_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funnel_id UUID REFERENCES public.crm_funnels(id) ON DELETE SET NULL,
  stage_id UUID REFERENCES public.crm_funnel_stages(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'whatsapp',
  content TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read templates" ON public.crm_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage templates" ON public.crm_templates FOR ALL TO authenticated USING (true);

-- Automations
CREATE TABLE public.crm_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  conditions JSONB NOT NULL DEFAULT '[]',
  actions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  executions_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read automations" ON public.crm_automations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage automations" ON public.crm_automations FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Automation Logs
CREATE TABLE public.crm_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.crm_automations(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  trigger_event TEXT,
  actions_executed JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_automation_logs_automation ON public.crm_automation_logs(automation_id);

ALTER TABLE public.crm_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read automation logs" ON public.crm_automation_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert automation logs" ON public.crm_automation_logs FOR INSERT TO authenticated WITH CHECK (true);

-- Goals
CREATE TABLE public.crm_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  deals_target INTEGER NOT NULL DEFAULT 0,
  value_target NUMERIC NOT NULL DEFAULT 0,
  activities_target INTEGER NOT NULL DEFAULT 0,
  calls_target INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.crm_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read goals" ON public.crm_goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage goals" ON public.crm_goals FOR ALL TO authenticated USING (true);

-- Goal Achievements (materialized counters, updated in real-time)
CREATE TABLE public.crm_goal_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  deals_done INTEGER NOT NULL DEFAULT 0,
  value_done NUMERIC NOT NULL DEFAULT 0,
  activities_done INTEGER NOT NULL DEFAULT 0,
  calls_done INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, month)
);

ALTER TABLE public.crm_goal_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read achievements" ON public.crm_goal_achievements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can manage achievements" ON public.crm_goal_achievements FOR ALL TO authenticated USING (true);

-- Enable realtime for ranking
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_goal_achievements;

-- Seed default scoring config
INSERT INTO public.crm_scoring_config (group_key, group_label, criterion_key, criterion_label, points, sort_order) VALUES
  ('profile', 'Perfil do Lead', 'has_phone', 'Tem telefone cadastrado', 10, 1),
  ('profile', 'Perfil do Lead', 'has_email', 'Tem e-mail cadastrado', 10, 2),
  ('profile', 'Perfil do Lead', 'has_company', 'Tem empresa cadastrada', 15, 3),
  ('profile', 'Perfil do Lead', 'origin_referral', 'Origem = Indicação', 20, 4),
  ('profile', 'Perfil do Lead', 'origin_inbound', 'Origem = Inbound', 15, 5),
  ('behavior', 'Comportamento no Funil', 'activity_answered', 'Respondeu a uma atividade', 15, 1),
  ('behavior', 'Comportamento no Funil', 'meeting_done', 'Reunião realizada', 20, 2),
  ('behavior', 'Comportamento no Funil', 'proposal_sent', 'Proposta enviada', 20, 3),
  ('behavior', 'Comportamento no Funil', 'below_avg_time', 'Tempo na etapa < média', 10, 4),
  ('behavior', 'Comportamento no Funil', 'above_2x_avg_time', 'Tempo na etapa > 2× média', -15, 5),
  ('engagement', 'Engajamento com a Cadência', 'cadence_50_pct', 'Cadência > 50% concluída', 15, 1),
  ('engagement', 'Engajamento com a Cadência', 'overdue_3_plus', 'Atividades atrasadas > 3', -10, 2),
  ('engagement', 'Engajamento com a Cadência', 'no_activity_7d', 'Sem atividade há 7+ dias', -15, 3),
  ('value', 'Valor e Fit', 'above_avg_ticket', 'Valor > ticket médio', 15, 1),
  ('value', 'Valor e Fit', 'above_2x_ticket', 'Valor > 2× ticket médio', 10, 2),
  ('value', 'Valor e Fit', 'returning_client', 'Cliente que já fechou antes', 20, 3);
