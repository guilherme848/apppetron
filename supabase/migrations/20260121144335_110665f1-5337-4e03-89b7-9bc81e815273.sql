-- ======================================
-- MÓDULO CUSTOMER SUCCESS - PETRON
-- Migração completa de todas as tabelas
-- ======================================

-- 1) AUDITORIA GLOBAL
CREATE TABLE public.cs_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL, -- onboarding_task, meeting, nps_response, risk_case, cancellation, etc.
  entity_id UUID NOT NULL,
  client_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- created, updated, status_changed, file_uploaded, etc.
  changed_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  changes_json JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_audit_log_entity ON public.cs_audit_log(entity_type, entity_id);
CREATE INDEX idx_cs_audit_log_client ON public.cs_audit_log(client_id);
CREATE INDEX idx_cs_audit_log_created ON public.cs_audit_log(created_at DESC);

ALTER TABLE public.cs_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_audit_log" ON public.cs_audit_log FOR ALL USING (true) WITH CHECK (true);

-- 2) ONBOARDING - FLUXOS (Templates)
CREATE TABLE public.cs_onboarding_flows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_onboarding_flows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_onboarding_flows" ON public.cs_onboarding_flows FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_onboarding_flows_updated_at
  BEFORE UPDATE ON public.cs_onboarding_flows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) ONBOARDING - REGRAS DE APLICAÇÃO DE FLUXO
CREATE TABLE public.cs_onboarding_flow_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.cs_onboarding_flows(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  client_type TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_onboarding_flow_rules_flow ON public.cs_onboarding_flow_rules(flow_id);
CREATE INDEX idx_cs_onboarding_flow_rules_service ON public.cs_onboarding_flow_rules(service_id);

ALTER TABLE public.cs_onboarding_flow_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_onboarding_flow_rules" ON public.cs_onboarding_flow_rules FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_onboarding_flow_rules_updated_at
  BEFORE UPDATE ON public.cs_onboarding_flow_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) ONBOARDING - TAREFAS DO FLUXO (Templates)
CREATE TABLE public.cs_onboarding_flow_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_id UUID NOT NULL REFERENCES public.cs_onboarding_flows(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description_rich TEXT,
  required BOOLEAN NOT NULL DEFAULT true,
  default_due_days INTEGER NOT NULL DEFAULT 0,
  default_responsible_role_key TEXT, -- cs | social | traffic | support | designer | videomaker
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_onboarding_flow_tasks_flow ON public.cs_onboarding_flow_tasks(flow_id);

ALTER TABLE public.cs_onboarding_flow_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_onboarding_flow_tasks" ON public.cs_onboarding_flow_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_onboarding_flow_tasks_updated_at
  BEFORE UPDATE ON public.cs_onboarding_flow_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) ONBOARDING - INSTÂNCIA POR CLIENTE
CREATE TABLE public.cs_client_onboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  flow_id UUID NOT NULL REFERENCES public.cs_onboarding_flows(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | completed | attention
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expected_end_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_client_onboarding_client ON public.cs_client_onboarding(client_id);
CREATE INDEX idx_cs_client_onboarding_status ON public.cs_client_onboarding(status);

ALTER TABLE public.cs_client_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_client_onboarding" ON public.cs_client_onboarding FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_client_onboarding_updated_at
  BEFORE UPDATE ON public.cs_client_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6) ONBOARDING - TAREFAS DO CLIENTE
CREATE TABLE public.cs_client_onboarding_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_onboarding_id UUID NOT NULL REFERENCES public.cs_client_onboarding(id) ON DELETE CASCADE,
  template_task_id UUID REFERENCES public.cs_onboarding_flow_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description_rich TEXT,
  status TEXT NOT NULL DEFAULT 'not_started', -- not_started | in_progress | done
  required BOOLEAN NOT NULL DEFAULT true,
  due_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  responsible_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  notes_rich TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_client_onboarding_tasks_onboarding ON public.cs_client_onboarding_tasks(client_onboarding_id);
CREATE INDEX idx_cs_client_onboarding_tasks_status ON public.cs_client_onboarding_tasks(status);
CREATE INDEX idx_cs_client_onboarding_tasks_responsible ON public.cs_client_onboarding_tasks(responsible_member_id);

ALTER TABLE public.cs_client_onboarding_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_client_onboarding_tasks" ON public.cs_client_onboarding_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_client_onboarding_tasks_updated_at
  BEFORE UPDATE ON public.cs_client_onboarding_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) ONBOARDING - ARQUIVOS DE TAREFA
CREATE TABLE public.cs_onboarding_task_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_task_id UUID NOT NULL REFERENCES public.cs_client_onboarding_tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_onboarding_task_files_task ON public.cs_onboarding_task_files(onboarding_task_id);

ALTER TABLE public.cs_onboarding_task_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_onboarding_task_files" ON public.cs_onboarding_task_files FOR ALL USING (true) WITH CHECK (true);

-- 8) ONBOARDING - HISTÓRICO DE TAREFA
CREATE TABLE public.cs_onboarding_task_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_task_id UUID NOT NULL REFERENCES public.cs_client_onboarding_tasks(id) ON DELETE CASCADE,
  changed_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_onboarding_task_history_task ON public.cs_onboarding_task_history(onboarding_task_id);

ALTER TABLE public.cs_onboarding_task_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_onboarding_task_history" ON public.cs_onboarding_task_history FOR ALL USING (true) WITH CHECK (true);

-- 9) REUNIÕES
CREATE TABLE public.cs_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  type TEXT NOT NULL DEFAULT 'monthly_followup', -- monthly_followup | strategic | alignment | emergency
  responsible_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | done | canceled | rescheduled
  objective_rich TEXT,
  decisions_rich TEXT,
  perception TEXT, -- very_satisfied | satisfied | neutral | dissatisfied
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_meetings_client ON public.cs_meetings(client_id);
CREATE INDEX idx_cs_meetings_date ON public.cs_meetings(meeting_date);
CREATE INDEX idx_cs_meetings_status ON public.cs_meetings(status);
CREATE INDEX idx_cs_meetings_responsible ON public.cs_meetings(responsible_member_id);

ALTER TABLE public.cs_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_meetings" ON public.cs_meetings FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_meetings_updated_at
  BEFORE UPDATE ON public.cs_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 10) AÇÕES DE REUNIÃO
CREATE TABLE public.cs_meeting_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.cs_meetings(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details_rich TEXT,
  due_at TIMESTAMP WITH TIME ZONE,
  assignee_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'todo', -- todo | doing | done
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_meeting_actions_meeting ON public.cs_meeting_actions(meeting_id);
CREATE INDEX idx_cs_meeting_actions_assignee ON public.cs_meeting_actions(assignee_member_id);
CREATE INDEX idx_cs_meeting_actions_status ON public.cs_meeting_actions(status);

ALTER TABLE public.cs_meeting_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_meeting_actions" ON public.cs_meeting_actions FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_meeting_actions_updated_at
  BEFORE UPDATE ON public.cs_meeting_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11) NPS - SURVEYS (Configuração)
CREATE TABLE public.cs_nps_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- after_onboarding_30 | every_90 | before_renewal | manual
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_nps_surveys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_nps_surveys" ON public.cs_nps_surveys FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_nps_surveys_updated_at
  BEFORE UPDATE ON public.cs_nps_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12) NPS - TAGS
CREATE TABLE public.cs_nps_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_nps_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_nps_tags" ON public.cs_nps_tags FOR ALL USING (true) WITH CHECK (true);

-- 13) NPS - RESPOSTAS
CREATE TABLE public.cs_nps_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  survey_id UUID REFERENCES public.cs_nps_surveys(id) ON DELETE SET NULL,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  comment_rich TEXT,
  classification TEXT NOT NULL, -- promoter | passive | detractor
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_nps_responses_client ON public.cs_nps_responses(client_id);
CREATE INDEX idx_cs_nps_responses_classification ON public.cs_nps_responses(classification);
CREATE INDEX idx_cs_nps_responses_created ON public.cs_nps_responses(created_at DESC);

ALTER TABLE public.cs_nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_nps_responses" ON public.cs_nps_responses FOR ALL USING (true) WITH CHECK (true);

-- 14) NPS - TAGS DAS RESPOSTAS (Many-to-Many)
CREATE TABLE public.cs_nps_response_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES public.cs_nps_responses(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.cs_nps_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(response_id, tag_id)
);
CREATE INDEX idx_cs_nps_response_tags_response ON public.cs_nps_response_tags(response_id);
CREATE INDEX idx_cs_nps_response_tags_tag ON public.cs_nps_response_tags(tag_id);

ALTER TABLE public.cs_nps_response_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_nps_response_tags" ON public.cs_nps_response_tags FOR ALL USING (true) WITH CHECK (true);

-- 15) RISCO
CREATE TABLE public.cs_risk_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'low', -- low | moderate | critical
  reason TEXT NOT NULL, -- nps_detractor | no_meetings | negative_feedback | pause_request | delays | manual
  details_rich TEXT,
  status TEXT NOT NULL DEFAULT 'open', -- open | in_progress | resolved
  owner_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_risk_cases_client ON public.cs_risk_cases(client_id);
CREATE INDEX idx_cs_risk_cases_status ON public.cs_risk_cases(status);
CREATE INDEX idx_cs_risk_cases_level ON public.cs_risk_cases(level);
CREATE INDEX idx_cs_risk_cases_owner ON public.cs_risk_cases(owner_member_id);

ALTER TABLE public.cs_risk_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_risk_cases" ON public.cs_risk_cases FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_risk_cases_updated_at
  BEFORE UPDATE ON public.cs_risk_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16) AÇÕES DE RISCO
CREATE TABLE public.cs_risk_action_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  risk_case_id UUID NOT NULL REFERENCES public.cs_risk_cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details_rich TEXT,
  assignee_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  due_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'todo', -- todo | doing | done
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_risk_action_items_risk ON public.cs_risk_action_items(risk_case_id);
CREATE INDEX idx_cs_risk_action_items_assignee ON public.cs_risk_action_items(assignee_member_id);
CREATE INDEX idx_cs_risk_action_items_status ON public.cs_risk_action_items(status);

ALTER TABLE public.cs_risk_action_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_risk_action_items" ON public.cs_risk_action_items FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_risk_action_items_updated_at
  BEFORE UPDATE ON public.cs_risk_action_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 17) CANCELAMENTOS
CREATE TABLE public.cs_cancellations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  effective_cancel_date DATE NOT NULL,
  retention_attempted BOOLEAN NOT NULL DEFAULT false,
  offer_applied TEXT,
  notes_rich TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
CREATE INDEX idx_cs_cancellations_client ON public.cs_cancellations(client_id);
CREATE INDEX idx_cs_cancellations_date ON public.cs_cancellations(effective_cancel_date);

ALTER TABLE public.cs_cancellations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_cancellations" ON public.cs_cancellations FOR ALL USING (true) WITH CHECK (true);

-- 18) MOTIVOS DE CANCELAMENTO (Catálogo)
CREATE TABLE public.cs_cancellation_reasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_cancellation_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_cancellation_reasons" ON public.cs_cancellation_reasons FOR ALL USING (true) WITH CHECK (true);

-- 19) LINKS CANCELAMENTO-MOTIVO (Many-to-Many)
CREATE TABLE public.cs_cancellation_reason_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cancellation_id UUID NOT NULL REFERENCES public.cs_cancellations(id) ON DELETE CASCADE,
  reason_id UUID NOT NULL REFERENCES public.cs_cancellation_reasons(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cancellation_id, reason_id)
);
CREATE INDEX idx_cs_cancellation_reason_links_cancellation ON public.cs_cancellation_reason_links(cancellation_id);
CREATE INDEX idx_cs_cancellation_reason_links_reason ON public.cs_cancellation_reason_links(reason_id);

ALTER TABLE public.cs_cancellation_reason_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_cancellation_reason_links" ON public.cs_cancellation_reason_links FOR ALL USING (true) WITH CHECK (true);

-- 20) CONFIGURAÇÕES DE CS
CREATE TABLE public.cs_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cs_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to cs_settings" ON public.cs_settings FOR ALL USING (true) WITH CHECK (true);

CREATE TRIGGER update_cs_settings_updated_at
  BEFORE UPDATE ON public.cs_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir configurações padrão
INSERT INTO public.cs_settings (key, value, description) VALUES
  ('days_without_meeting_alert', '30', 'Dias sem reunião para gerar alerta'),
  ('onboarding_sla_days', '30', 'SLA padrão de onboarding em dias'),
  ('nps_interval_days', '90', 'Intervalo padrão entre pesquisas NPS');

-- 21) STORAGE BUCKET PARA CS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cs-files', 'cs-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies para cs-files
CREATE POLICY "CS files are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'cs-files');

CREATE POLICY "Anyone can upload CS files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'cs-files');

CREATE POLICY "Anyone can update CS files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'cs-files');

CREATE POLICY "Anyone can delete CS files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'cs-files');

-- 22) PERMISSÕES DE CS
INSERT INTO public.permissions (key, label) VALUES
  ('view_cs', 'Visualizar Customer Success'),
  ('edit_cs', 'Editar Customer Success'),
  ('manage_cs_settings', 'Gerenciar Configurações de CS'),
  ('view_sensitive_cs', 'Visualizar Dados Sensíveis de CS')
ON CONFLICT (key) DO NOTHING;

-- 23) INSERIR SURVEYS NPS PADRÃO
INSERT INTO public.cs_nps_surveys (name, trigger_type, active) VALUES
  ('Pós-Onboarding (30 dias)', 'after_onboarding_30', true),
  ('Trimestral', 'every_90', true),
  ('Pré-Renovação', 'before_renewal', true),
  ('Manual', 'manual', true);

-- 24) INSERIR MOTIVOS DE CANCELAMENTO PADRÃO
INSERT INTO public.cs_cancellation_reasons (name, active) VALUES
  ('Preço', true),
  ('Qualidade do serviço', true),
  ('Falta de resultados', true),
  ('Problemas de comunicação', true),
  ('Mudança de estratégia', true),
  ('Fechou a empresa', true),
  ('Contratou concorrente', true),
  ('Internalizou o serviço', true),
  ('Outros', true);

-- 25) INSERIR TAGS NPS PADRÃO
INSERT INTO public.cs_nps_tags (name, active) VALUES
  ('Atendimento', true),
  ('Qualidade', true),
  ('Prazo', true),
  ('Comunicação', true),
  ('Resultados', true),
  ('Preço', true),
  ('Suporte', true),
  ('Criatividade', true);