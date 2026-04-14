-- Orçamento mensal contratado por ad account (pacing)
ALTER TABLE public.client_meta_ad_accounts
ADD COLUMN IF NOT EXISTS monthly_ad_budget numeric;

COMMENT ON COLUMN public.client_meta_ad_accounts.monthly_ad_budget IS
'Verba mensal contratada com o cliente para investir em anúncios (R$). NULL = não configurado.';

-- Tabela para alertas disparados (motor vai gravar aqui)
CREATE TABLE IF NOT EXISTS public.alerts_triggered (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id         uuid REFERENCES public.traffic_alert_rules(id) ON DELETE SET NULL,
  ad_account_id   text NOT NULL,
  client_id       uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  campaign_id     text,
  severity        text NOT NULL DEFAULT 'attention',
  kind            text NOT NULL,
  message         text NOT NULL,
  metric_value    numeric,
  baseline_value  numeric,
  action_hint     text,
  triggered_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at     timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid
);

CREATE INDEX IF NOT EXISTS idx_alerts_triggered_account ON public.alerts_triggered(ad_account_id, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_unresolved ON public.alerts_triggered(triggered_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_rule ON public.alerts_triggered(rule_id);

ALTER TABLE public.alerts_triggered ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read alerts" ON public.alerts_triggered FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write alerts" ON public.alerts_triggered FOR ALL TO authenticated USING (true) WITH CHECK (true);
