-- Relatórios MatCon: estrutura pra geração automática e envio
-- Cada geração é uma linha; histórico completo mantido.

CREATE TABLE IF NOT EXISTS public.matcon_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id       uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  ad_account_id   text,
  period_type     text NOT NULL DEFAULT 'weekly',   -- weekly | monthly | custom
  period_start    date NOT NULL,
  period_end      date NOT NULL,
  report_data     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- métricas estruturadas
  narrative       jsonb,                                -- comentários IA por seção
  next_steps      jsonb,                                -- ações próxima semana
  pdf_url         text,
  status          text NOT NULL DEFAULT 'draft',        -- draft|generated|sent|viewed|failed
  sent_at         timestamptz,
  sent_via        text,                                 -- whatsapp|email|both
  sent_to         text,                                 -- destinatário final (telefone/email)
  viewed_at       timestamptz,
  error_message   text,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matcon_reports_client ON public.matcon_reports(client_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_matcon_reports_status ON public.matcon_reports(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_matcon_reports_client_period
  ON public.matcon_reports(client_id, period_start, period_end, period_type);

ALTER TABLE public.matcon_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read matcon_reports" ON public.matcon_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write matcon_reports" ON public.matcon_reports FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Config por cliente: opt-in/out, destinatário customizado
CREATE TABLE IF NOT EXISTS public.matcon_report_config (
  client_id       uuid PRIMARY KEY REFERENCES public.accounts(id) ON DELETE CASCADE,
  enabled         boolean NOT NULL DEFAULT true,
  frequency       text NOT NULL DEFAULT 'weekly',    -- weekly | monthly | off
  send_day        integer DEFAULT 1,                  -- 0=dom, 1=seg, ..., 6=sáb
  send_hour       integer DEFAULT 8,                  -- 0-23
  whatsapp_to     text,                               -- override do contato padrão
  email_to        text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.matcon_report_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read matcon_report_config" ON public.matcon_report_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write matcon_report_config" ON public.matcon_report_config FOR ALL TO authenticated USING (true) WITH CHECK (true);
