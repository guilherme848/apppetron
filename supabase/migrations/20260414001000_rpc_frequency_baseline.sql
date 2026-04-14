-- Atualiza o RPC de monitoramento de campanhas para incluir:
-- - frequency (fadiga)
-- - CPM/CTR agregados por período
-- - decomposição: impressões, cliques, conversas em cada período

DROP FUNCTION IF EXISTS public.get_campaign_monitoring(text[], date, date, date, date);

CREATE OR REPLACE FUNCTION public.get_campaign_monitoring(
  p_ad_account_ids text[],
  p_curr_from date,
  p_curr_to date,
  p_prev_from date,
  p_prev_to date
)
RETURNS TABLE (
  campaign_id text,
  ad_account_id text,
  name text,
  effective_status text,
  daily_budget numeric,
  curr_spend numeric,
  curr_conversations numeric,
  curr_leads numeric,
  curr_impressions numeric,
  curr_clicks numeric,
  curr_messaging_replies numeric,
  curr_frequency_avg numeric,
  prev_spend numeric,
  prev_conversations numeric,
  prev_leads numeric,
  prev_impressions numeric,
  prev_clicks numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH metrics AS (
    SELECT
      m.campaign_id, m.ad_account_id, m.date,
      COALESCE((m.metrics_json->>'spend')::numeric, 0) AS spend,
      COALESCE((m.metrics_json->>'whatsapp_conversations')::numeric, 0) AS conversations,
      COALESCE((m.metrics_json->>'leads')::numeric, 0) AS leads,
      COALESCE((m.metrics_json->>'impressions')::numeric, 0) AS impressions,
      COALESCE((m.metrics_json->>'clicks')::numeric, 0) AS clicks,
      COALESCE((m.metrics_json->>'messaging_replies')::numeric, 0) AS messaging_replies,
      COALESCE((m.metrics_json->>'frequency')::numeric, 0) AS frequency
    FROM public.meta_campaign_metrics_daily m
    WHERE m.ad_account_id = ANY(p_ad_account_ids)
      AND m.date >= LEAST(p_curr_from, p_prev_from)
      AND m.date <= GREATEST(p_curr_to, p_prev_to)
  ),
  aggregated AS (
    SELECT
      campaign_id, ad_account_id,
      SUM(spend) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_conversations,
      SUM(leads) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_leads,
      SUM(impressions) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_clicks,
      SUM(messaging_replies) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_messaging_replies,
      AVG(NULLIF(frequency, 0)) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_frequency_avg,
      SUM(spend) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_conversations,
      SUM(leads) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_leads,
      SUM(impressions) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_clicks
    FROM metrics
    GROUP BY campaign_id, ad_account_id
  ),
  ids_with_activity AS (SELECT DISTINCT campaign_id FROM aggregated),
  relevant AS (
    SELECT c.campaign_id, c.ad_account_id, c.name, c.effective_status, c.daily_budget
    FROM public.meta_campaigns c
    WHERE c.campaign_id IN (SELECT campaign_id FROM ids_with_activity)
       OR (c.ad_account_id = ANY(p_ad_account_ids) AND c.effective_status = 'ACTIVE')
  )
  SELECT
    r.campaign_id, r.ad_account_id, r.name, r.effective_status, r.daily_budget,
    COALESCE(a.curr_spend, 0), COALESCE(a.curr_conversations, 0), COALESCE(a.curr_leads, 0),
    COALESCE(a.curr_impressions, 0), COALESCE(a.curr_clicks, 0), COALESCE(a.curr_messaging_replies, 0),
    COALESCE(a.curr_frequency_avg, 0),
    COALESCE(a.prev_spend, 0), COALESCE(a.prev_conversations, 0), COALESCE(a.prev_leads, 0),
    COALESCE(a.prev_impressions, 0), COALESCE(a.prev_clicks, 0)
  FROM relevant r
  LEFT JOIN aggregated a ON a.campaign_id = r.campaign_id
  ORDER BY r.ad_account_id, COALESCE(a.curr_spend, 0) DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_campaign_monitoring(text[], date, date, date, date) TO authenticated;

-- RPC agregado POR CONTA: decomposição do funil com CPM/CTR/taxa de conversa
-- Para cada conta, retorna valores do período atual vs baseline 14d normalizado
CREATE OR REPLACE FUNCTION public.get_account_funnel_decomposition(
  p_ad_account_ids text[],
  p_curr_from date,
  p_curr_to date
)
RETURNS TABLE (
  ad_account_id text,
  curr_spend numeric,
  curr_impressions numeric,
  curr_clicks numeric,
  curr_conversations numeric,
  curr_cpm numeric,
  curr_ctr numeric,
  curr_conv_rate numeric,  -- conversas / cliques
  baseline_cpm numeric,
  baseline_ctr numeric,
  baseline_conv_rate numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH
  curr AS (
    SELECT
      ad_account_id,
      SUM(COALESCE((metrics_json->>'spend')::numeric, 0)) AS spend,
      SUM(COALESCE((metrics_json->>'impressions')::numeric, 0)) AS impressions,
      SUM(COALESCE((metrics_json->>'clicks')::numeric, 0)) AS clicks,
      SUM(COALESCE((metrics_json->>'whatsapp_conversations')::numeric, 0)) AS conversations
    FROM public.ad_account_metrics_daily
    WHERE ad_account_id = ANY(p_ad_account_ids)
      AND date BETWEEN p_curr_from AND p_curr_to
      AND platform = 'meta'
    GROUP BY ad_account_id
  ),
  baseline AS (
    SELECT
      ad_account_id,
      SUM(COALESCE((metrics_json->>'spend')::numeric, 0)) AS spend,
      SUM(COALESCE((metrics_json->>'impressions')::numeric, 0)) AS impressions,
      SUM(COALESCE((metrics_json->>'clicks')::numeric, 0)) AS clicks,
      SUM(COALESCE((metrics_json->>'whatsapp_conversations')::numeric, 0)) AS conversations
    FROM public.ad_account_metrics_daily
    WHERE ad_account_id = ANY(p_ad_account_ids)
      AND date BETWEEN (p_curr_from - INTERVAL '14 days')::date AND (p_curr_from - INTERVAL '1 day')::date
      AND platform = 'meta'
    GROUP BY ad_account_id
  )
  SELECT
    COALESCE(c.ad_account_id, b.ad_account_id) AS ad_account_id,
    COALESCE(c.spend, 0), COALESCE(c.impressions, 0), COALESCE(c.clicks, 0), COALESCE(c.conversations, 0),
    CASE WHEN c.impressions > 0 THEN (c.spend / c.impressions) * 1000 ELSE 0 END AS curr_cpm,
    CASE WHEN c.impressions > 0 THEN (c.clicks::numeric / c.impressions) * 100 ELSE 0 END AS curr_ctr,
    CASE WHEN c.clicks > 0 THEN (c.conversations::numeric / c.clicks) * 100 ELSE 0 END AS curr_conv_rate,
    CASE WHEN b.impressions > 0 THEN (b.spend / b.impressions) * 1000 ELSE 0 END AS baseline_cpm,
    CASE WHEN b.impressions > 0 THEN (b.clicks::numeric / b.impressions) * 100 ELSE 0 END AS baseline_ctr,
    CASE WHEN b.clicks > 0 THEN (b.conversations::numeric / b.clicks) * 100 ELSE 0 END AS baseline_conv_rate
  FROM curr c
  FULL OUTER JOIN baseline b USING (ad_account_id);
$$;
GRANT EXECUTE ON FUNCTION public.get_account_funnel_decomposition(text[], date, date) TO authenticated;
