-- Snooze por alerta específico ou por (rule_id, client_id)
-- Engine de alertas precisa respeitar e não criar novos alertas pra pares pausados

CREATE TABLE IF NOT EXISTS public.alert_snoozes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id        uuid REFERENCES public.traffic_alert_rules(id) ON DELETE CASCADE,
  client_id      uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  ad_account_id  text,
  kind           text,             -- pra regras especiais (runway_low, no_conversations)
  snoozed_until  timestamptz NOT NULL,
  reason         text,
  created_by     uuid,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_snoozes_active ON public.alert_snoozes(snoozed_until) WHERE snoozed_until > now();
CREATE INDEX IF NOT EXISTS idx_alert_snoozes_rule_client ON public.alert_snoozes(rule_id, client_id);
CREATE INDEX IF NOT EXISTS idx_alert_snoozes_kind ON public.alert_snoozes(kind, ad_account_id);

ALTER TABLE public.alert_snoozes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read alert_snoozes" ON public.alert_snoozes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write alert_snoozes" ON public.alert_snoozes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Helper: snooze um par rule+client por N horas
CREATE OR REPLACE FUNCTION public.snooze_alert(
  p_rule_id uuid,
  p_client_id uuid,
  p_ad_account_id text,
  p_kind text,
  p_hours integer,
  p_reason text
)
RETURNS uuid
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.alert_snoozes (rule_id, client_id, ad_account_id, kind, snoozed_until, reason)
  VALUES (p_rule_id, p_client_id, p_ad_account_id, p_kind, now() + (p_hours || ' hours')::interval, p_reason)
  RETURNING id;
$$;
GRANT EXECUTE ON FUNCTION public.snooze_alert(uuid, uuid, text, text, integer, text) TO authenticated;
