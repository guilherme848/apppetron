
-- CRM Funnels
CREATE TABLE public.crm_funnels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#F97316',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_funnels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage funnels" ON public.crm_funnels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Funnel Stages
CREATE TABLE public.crm_funnel_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.crm_funnels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#E2E8F0',
  sort_order INT NOT NULL DEFAULT 0,
  probability INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_funnel_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage funnel stages" ON public.crm_funnel_stages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_funnel_stages_funnel ON public.crm_funnel_stages(funnel_id);

-- CRM Contacts
CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  origin TEXT,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage contacts" ON public.crm_contacts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_contacts_name ON public.crm_contacts(name);
CREATE INDEX idx_crm_contacts_company ON public.crm_contacts(company);
CREATE INDEX idx_crm_contacts_email ON public.crm_contacts(email);

-- CRM Deals
CREATE TABLE public.crm_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_id UUID NOT NULL REFERENCES public.crm_funnels(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.crm_funnel_stages(id) ON DELETE RESTRICT,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,2) DEFAULT 0,
  probability INT DEFAULT 0,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deals" ON public.crm_deals FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_deals_funnel ON public.crm_deals(funnel_id);
CREATE INDEX idx_crm_deals_stage ON public.crm_deals(stage_id);
CREATE INDEX idx_crm_deals_contact ON public.crm_deals(contact_id);
CREATE INDEX idx_crm_deals_responsible ON public.crm_deals(responsible_id);
CREATE INDEX idx_crm_deals_status ON public.crm_deals(status);

-- CRM Deal Stage History
CREATE TABLE public.crm_deal_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES public.crm_funnel_stages(id) ON DELETE SET NULL,
  to_stage_id UUID NOT NULL REFERENCES public.crm_funnel_stages(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_deal_stage_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deal history" ON public.crm_deal_stage_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_deal_history_deal ON public.crm_deal_stage_history(deal_id);

-- CRM Cadences
CREATE TABLE public.crm_cadences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  funnel_id UUID REFERENCES public.crm_funnels(id) ON DELETE SET NULL,
  trigger_stage_id UUID REFERENCES public.crm_funnel_stages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_cadences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cadences" ON public.crm_cadences FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- CRM Cadence Steps
CREATE TABLE public.crm_cadence_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cadence_id UUID NOT NULL REFERENCES public.crm_cadences(id) ON DELETE CASCADE,
  day_offset INT NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'call',
  title TEXT NOT NULL,
  description TEXT,
  responsible_type TEXT NOT NULL DEFAULT 'deal_owner',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_cadence_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage cadence steps" ON public.crm_cadence_steps FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_cadence_steps_cadence ON public.crm_cadence_steps(cadence_id);

-- CRM Activities
CREATE TABLE public.crm_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  cadence_id UUID REFERENCES public.crm_cadences(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'task',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result TEXT,
  notes TEXT,
  responsible_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage activities" ON public.crm_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_activities_deal ON public.crm_activities(deal_id);
CREATE INDEX idx_crm_activities_contact ON public.crm_activities(contact_id);
CREATE INDEX idx_crm_activities_scheduled ON public.crm_activities(scheduled_at);
CREATE INDEX idx_crm_activities_responsible ON public.crm_activities(responsible_id);
CREATE INDEX idx_crm_activities_status ON public.crm_activities(status);

-- CRM Calls
CREATE TABLE public.crm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID REFERENCES public.crm_contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.crm_deals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  phone TEXT,
  duration INT DEFAULT 0,
  result TEXT,
  notes TEXT,
  api4com_call_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.crm_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage calls" ON public.crm_calls FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX idx_crm_calls_contact ON public.crm_calls(contact_id);
CREATE INDEX idx_crm_calls_deal ON public.crm_calls(deal_id);

-- Seed default funnels
INSERT INTO public.crm_funnels (id, name, description, color) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Inbound Marketing', 'Leads vindos de canais de marketing digital', '#F97316'),
  ('a0000002-0000-0000-0000-000000000002', 'Reaquecimento', 'Reativação de leads inativos', '#0F766E'),
  ('a0000003-0000-0000-0000-000000000003', 'Prospecção Ativa', 'Outbound e prospecção direta', '#1B2B3B');

-- Seed Inbound stages
INSERT INTO public.crm_funnel_stages (funnel_id, name, color, sort_order, probability) VALUES
  ('a0000001-0000-0000-0000-000000000001', 'Pré-Análise', '#E2E8F0', 1, 5),
  ('a0000001-0000-0000-0000-000000000001', 'Em Contato', '#CBD5E1', 2, 10),
  ('a0000001-0000-0000-0000-000000000001', 'Qualificação', '#94A3B8', 3, 20),
  ('a0000001-0000-0000-0000-000000000001', 'Agendamento', '#64748B', 4, 30),
  ('a0000001-0000-0000-0000-000000000001', 'Reunião Agendada', '#475569', 5, 50),
  ('a0000001-0000-0000-0000-000000000001', 'Proposta', '#334155', 6, 60),
  ('a0000001-0000-0000-0000-000000000001', 'Negociação', '#1E293B', 7, 80),
  ('a0000001-0000-0000-0000-000000000001', 'Venda Fechada', '#0F766E', 8, 100);

-- Seed Reaquecimento stages
INSERT INTO public.crm_funnel_stages (funnel_id, name, color, sort_order, probability) VALUES
  ('a0000002-0000-0000-0000-000000000002', 'Identificado', '#E2E8F0', 1, 10),
  ('a0000002-0000-0000-0000-000000000002', 'Em Contato', '#94A3B8', 2, 30),
  ('a0000002-0000-0000-0000-000000000002', 'Proposta', '#475569', 3, 60),
  ('a0000002-0000-0000-0000-000000000002', 'Fechado', '#0F766E', 4, 100);

-- Seed Prospecção Ativa stages
INSERT INTO public.crm_funnel_stages (funnel_id, name, color, sort_order, probability) VALUES
  ('a0000003-0000-0000-0000-000000000003', 'Prospectado', '#E2E8F0', 1, 5),
  ('a0000003-0000-0000-0000-000000000003', 'Primeiro Contato', '#CBD5E1', 2, 15),
  ('a0000003-0000-0000-0000-000000000003', 'Qualificado', '#94A3B8', 3, 30),
  ('a0000003-0000-0000-0000-000000000003', 'Proposta', '#475569', 4, 60),
  ('a0000003-0000-0000-0000-000000000003', 'Negociação', '#1E293B', 5, 80),
  ('a0000003-0000-0000-0000-000000000003', 'Venda Fechada', '#0F766E', 6, 100);
