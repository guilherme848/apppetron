-- Meta campaign-level data for Central de Monitoramento
-- Stores campaign entities and daily metrics per campaign

CREATE TABLE IF NOT EXISTS public.meta_campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     text NOT NULL UNIQUE,
  ad_account_id   text NOT NULL,
  name            text NOT NULL,
  objective       text,
  status          text,
  effective_status text,
  daily_budget    numeric,
  lifetime_budget numeric,
  start_time      timestamptz,
  stop_time       timestamptz,
  created_time    timestamptz,
  updated_time    timestamptz,
  raw_json        jsonb,
  last_synced_at  timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_account ON public.meta_campaigns(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_campaigns_status ON public.meta_campaigns(effective_status);

ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read meta_campaigns"
ON public.meta_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write meta_campaigns"
ON public.meta_campaigns FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.meta_campaign_metrics_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     text NOT NULL,
  ad_account_id   text NOT NULL,
  date            date NOT NULL,
  platform        text NOT NULL DEFAULT 'meta',
  metrics_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_campaign_metrics_daily_unique UNIQUE (campaign_id, date, platform)
);

CREATE INDEX IF NOT EXISTS idx_camp_metrics_account_date ON public.meta_campaign_metrics_daily(ad_account_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_camp_metrics_campaign_date ON public.meta_campaign_metrics_daily(campaign_id, date DESC);

ALTER TABLE public.meta_campaign_metrics_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read meta_campaign_metrics"
ON public.meta_campaign_metrics_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write meta_campaign_metrics"
ON public.meta_campaign_metrics_daily FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Log table: track each sync run for observability
CREATE TABLE IF NOT EXISTS public.meta_sync_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type        text NOT NULL, -- 'account' | 'campaign' | 'full'
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  status          text, -- 'running' | 'success' | 'error' | 'partial'
  accounts_total  integer,
  accounts_ok     integer,
  accounts_error  integer,
  campaigns_total integer,
  campaigns_ok    integer,
  campaigns_error integer,
  error_message   text,
  details_json    jsonb
);

CREATE INDEX IF NOT EXISTS idx_meta_sync_logs_started ON public.meta_sync_logs(started_at DESC);

ALTER TABLE public.meta_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meta_sync_logs"
ON public.meta_sync_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service write meta_sync_logs"
ON public.meta_sync_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
