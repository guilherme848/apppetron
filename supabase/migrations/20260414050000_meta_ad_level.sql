-- Meta nível anúncio (ad) — entidades + métricas diárias + criativos

CREATE TABLE IF NOT EXISTS public.meta_ads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id             text NOT NULL UNIQUE,
  adset_id          text,
  campaign_id       text,
  ad_account_id     text NOT NULL,
  name              text NOT NULL,
  effective_status  text,
  status            text,
  creative_id       text,
  created_time      timestamptz,
  updated_time      timestamptz,
  raw_json          jsonb,
  last_synced_at    timestamptz NOT NULL DEFAULT now(),
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_ads_campaign ON public.meta_ads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_account ON public.meta_ads(ad_account_id);
CREATE INDEX IF NOT EXISTS idx_meta_ads_status ON public.meta_ads(effective_status);

ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meta_ads" ON public.meta_ads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write meta_ads" ON public.meta_ads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.meta_ad_metrics_daily (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id           text NOT NULL,
  campaign_id     text,
  ad_account_id   text NOT NULL,
  date            date NOT NULL,
  platform        text NOT NULL DEFAULT 'meta',
  metrics_json    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT meta_ad_metrics_daily_unique UNIQUE (ad_id, date, platform)
);
CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_ad_date ON public.meta_ad_metrics_daily(ad_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_campaign_date ON public.meta_ad_metrics_daily(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ad_metrics_account_date ON public.meta_ad_metrics_daily(ad_account_id, date DESC);

ALTER TABLE public.meta_ad_metrics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meta_ad_metrics" ON public.meta_ad_metrics_daily FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write meta_ad_metrics" ON public.meta_ad_metrics_daily FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Criativos: imagem/thumbnail pra display
CREATE TABLE IF NOT EXISTS public.meta_ad_creatives (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creative_id         text NOT NULL UNIQUE,
  ad_account_id       text,
  name                text,
  title               text,
  body                text,
  thumbnail_url       text,
  image_url           text,
  video_id            text,
  object_type         text,
  instagram_permalink text,
  raw_json            jsonb,
  last_synced_at      timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_meta_creatives_account ON public.meta_ad_creatives(ad_account_id);

ALTER TABLE public.meta_ad_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read meta_creatives" ON public.meta_ad_creatives FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated write meta_creatives" ON public.meta_ad_creatives FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- RPC pra drill-down de ads por campanha
CREATE OR REPLACE FUNCTION public.get_ad_monitoring(
  p_campaign_id text,
  p_curr_from date,
  p_curr_to date,
  p_prev_from date,
  p_prev_to date
)
RETURNS TABLE (
  ad_id text,
  campaign_id text,
  ad_account_id text,
  name text,
  effective_status text,
  creative_id text,
  thumbnail_url text,
  image_url text,
  creative_title text,
  creative_body text,
  curr_spend numeric,
  curr_conversations numeric,
  curr_impressions numeric,
  curr_clicks numeric,
  curr_reach numeric,
  curr_frequency_avg numeric,
  prev_spend numeric,
  prev_conversations numeric,
  prev_impressions numeric,
  prev_clicks numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH metrics AS (
    SELECT
      m.ad_id, m.campaign_id, m.ad_account_id, m.date,
      COALESCE((m.metrics_json->>'spend')::numeric, 0) AS spend,
      COALESCE((m.metrics_json->>'whatsapp_conversations')::numeric, 0) AS conversations,
      COALESCE((m.metrics_json->>'impressions')::numeric, 0) AS impressions,
      COALESCE((m.metrics_json->>'clicks')::numeric, 0) AS clicks,
      COALESCE((m.metrics_json->>'reach')::numeric, 0) AS reach,
      COALESCE((m.metrics_json->>'frequency')::numeric, 0) AS frequency
    FROM public.meta_ad_metrics_daily m
    WHERE m.campaign_id = p_campaign_id
      AND m.date >= LEAST(p_curr_from, p_prev_from)
      AND m.date <= GREATEST(p_curr_to, p_prev_to)
  ),
  aggregated AS (
    SELECT
      ad_id, campaign_id, ad_account_id,
      SUM(spend) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_conversations,
      SUM(impressions) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_clicks,
      SUM(reach) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_reach,
      AVG(NULLIF(frequency, 0)) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_frequency_avg,
      SUM(spend) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_conversations,
      SUM(impressions) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_clicks
    FROM metrics
    GROUP BY ad_id, campaign_id, ad_account_id
  ),
  relevant AS (
    SELECT a.ad_id, a.campaign_id, a.ad_account_id, a.name, a.effective_status, a.creative_id
    FROM public.meta_ads a
    WHERE a.campaign_id = p_campaign_id
      AND (a.ad_id IN (SELECT ad_id FROM aggregated) OR a.effective_status = 'ACTIVE')
  )
  SELECT
    r.ad_id, r.campaign_id, r.ad_account_id, r.name, r.effective_status, r.creative_id,
    c.thumbnail_url, c.image_url, c.title, c.body,
    COALESCE(a.curr_spend, 0),
    COALESCE(a.curr_conversations, 0),
    COALESCE(a.curr_impressions, 0),
    COALESCE(a.curr_clicks, 0),
    COALESCE(a.curr_reach, 0),
    COALESCE(a.curr_frequency_avg, 0),
    COALESCE(a.prev_spend, 0),
    COALESCE(a.prev_conversations, 0),
    COALESCE(a.prev_impressions, 0),
    COALESCE(a.prev_clicks, 0)
  FROM relevant r
  LEFT JOIN aggregated a ON a.ad_id = r.ad_id
  LEFT JOIN public.meta_ad_creatives c ON c.creative_id = r.creative_id
  ORDER BY COALESCE(a.curr_spend, 0) DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_ad_monitoring(text, date, date, date, date) TO authenticated;
