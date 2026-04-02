
-- 1. traffic_contact_reasons
CREATE TABLE public.traffic_contact_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_contact_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact reasons"
  ON public.traffic_contact_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage contact reasons"
  ON public.traffic_contact_reasons FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed
INSERT INTO public.traffic_contact_reasons (name, color, sort_order) VALUES
  ('Feedback', '#22C55E', 0),
  ('Sugestão de Melhoria', '#8B5CF6', 1),
  ('Atendimento', '#EAB308', 2),
  ('Relatórios', '#EAB308', 3),
  ('Não há necessidade', '#9CA3AF', 4),
  ('Solicitação de Ofertas', '#F97316', 5),
  ('Desenvolvimento de Criativos', '#EC4899', 6);

-- 2. traffic_contact_channels
CREATE TABLE public.traffic_contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_contact_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact channels"
  ON public.traffic_contact_channels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage contact channels"
  ON public.traffic_contact_channels FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed
INSERT INTO public.traffic_contact_channels (name, icon, sort_order) VALUES
  ('WhatsApp', 'message-circle', 0),
  ('Ligação', 'phone', 1),
  ('E-mail', 'mail', 2),
  ('Reunião', 'video', 3),
  ('Presencial', 'user', 4);

-- 3. traffic_contact_settings
CREATE TABLE public.traffic_contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency_days INTEGER NOT NULL DEFAULT 7,
  warning_threshold_days INTEGER NOT NULL DEFAULT 5,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.team_members(id)
);

ALTER TABLE public.traffic_contact_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact settings"
  ON public.traffic_contact_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update contact settings"
  ON public.traffic_contact_settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Seed
INSERT INTO public.traffic_contact_settings (frequency_days, warning_threshold_days) VALUES (7, 5);

-- 4. traffic_contacts
CREATE TABLE public.traffic_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  reason_id UUID REFERENCES public.traffic_contact_reasons(id) ON DELETE SET NULL,
  channel_id UUID REFERENCES public.traffic_contact_channels(id) ON DELETE SET NULL,
  result TEXT CHECK (result IN ('positivo', 'neutro', 'negativo')),
  notes TEXT,
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_traffic_contacts_client_id ON public.traffic_contacts(client_id);
CREATE INDEX idx_traffic_contacts_member_id ON public.traffic_contacts(member_id);
CREATE INDEX idx_traffic_contacts_contact_date ON public.traffic_contacts(contact_date);
CREATE INDEX idx_traffic_contacts_member_date ON public.traffic_contacts(member_id, contact_date);
CREATE INDEX idx_traffic_contacts_client_completed ON public.traffic_contacts(client_id, completed);

ALTER TABLE public.traffic_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contacts"
  ON public.traffic_contacts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contacts"
  ON public.traffic_contacts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update contacts"
  ON public.traffic_contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete contacts"
  ON public.traffic_contacts FOR DELETE TO authenticated USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_traffic_contacts_updated_at
  BEFORE UPDATE ON public.traffic_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. traffic_contact_comments
CREATE TABLE public.traffic_contact_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.traffic_contacts(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_traffic_contact_comments_contact_id ON public.traffic_contact_comments(contact_id);

ALTER TABLE public.traffic_contact_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read contact comments"
  ON public.traffic_contact_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert contact comments"
  ON public.traffic_contact_comments FOR INSERT TO authenticated WITH CHECK (true);

-- 6. View: traffic_client_last_contact
CREATE OR REPLACE VIEW public.traffic_client_last_contact AS
SELECT
  a.id AS client_id,
  a.name AS client_name,
  a.traffic_member_id,
  a.status AS client_status,
  MAX(tc.contact_date) FILTER (WHERE tc.completed = true) AS last_contact_date,
  CURRENT_DATE - MAX(tc.contact_date) FILTER (WHERE tc.completed = true) AS days_since_contact
FROM public.accounts a
LEFT JOIN public.traffic_contacts tc ON tc.client_id = a.id
WHERE a.status = 'active' AND a.deleted_at IS NULL
GROUP BY a.id, a.name, a.traffic_member_id, a.status;
