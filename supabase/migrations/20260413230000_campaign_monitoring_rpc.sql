-- RPC: agrega campanhas por período e baseline em UMA query por conta
-- Evita N round-trips PostgREST; retorna tudo pronto pra UI

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
  prev_spend numeric,
  prev_conversations numeric,
  prev_leads numeric,
  prev_impressions numeric,
  prev_clicks numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH metrics AS (
    SELECT
      m.campaign_id,
      m.ad_account_id,
      m.date,
      COALESCE((m.metrics_json->>'spend')::numeric, 0) AS spend,
      COALESCE((m.metrics_json->>'whatsapp_conversations')::numeric, 0) AS conversations,
      COALESCE((m.metrics_json->>'leads')::numeric, 0) AS leads,
      COALESCE((m.metrics_json->>'impressions')::numeric, 0) AS impressions,
      COALESCE((m.metrics_json->>'clicks')::numeric, 0) AS clicks,
      COALESCE((m.metrics_json->>'messaging_replies')::numeric, 0) AS messaging_replies
    FROM public.meta_campaign_metrics_daily m
    WHERE m.ad_account_id = ANY(p_ad_account_ids)
      AND m.date >= LEAST(p_curr_from, p_prev_from)
      AND m.date <= GREATEST(p_curr_to, p_prev_to)
  ),
  aggregated AS (
    SELECT
      campaign_id,
      ad_account_id,
      SUM(spend) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_conversations,
      SUM(leads) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_leads,
      SUM(impressions) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_clicks,
      SUM(messaging_replies) FILTER (WHERE date BETWEEN p_curr_from AND p_curr_to) AS curr_messaging_replies,
      SUM(spend) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_spend,
      SUM(conversations) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_conversations,
      SUM(leads) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_leads,
      SUM(impressions) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_impressions,
      SUM(clicks) FILTER (WHERE date BETWEEN p_prev_from AND p_prev_to) AS prev_clicks
    FROM metrics
    GROUP BY campaign_id, ad_account_id
  ),
  campaign_ids_with_activity AS (
    SELECT DISTINCT campaign_id FROM aggregated
  ),
  relevant_campaigns AS (
    SELECT c.campaign_id, c.ad_account_id, c.name, c.effective_status, c.daily_budget
    FROM public.meta_campaigns c
    WHERE c.campaign_id IN (SELECT campaign_id FROM campaign_ids_with_activity)
       OR (c.ad_account_id = ANY(p_ad_account_ids) AND c.effective_status = 'ACTIVE')
  )
  SELECT
    rc.campaign_id,
    rc.ad_account_id,
    rc.name,
    rc.effective_status,
    rc.daily_budget,
    COALESCE(a.curr_spend, 0),
    COALESCE(a.curr_conversations, 0),
    COALESCE(a.curr_leads, 0),
    COALESCE(a.curr_impressions, 0),
    COALESCE(a.curr_clicks, 0),
    COALESCE(a.curr_messaging_replies, 0),
    COALESCE(a.prev_spend, 0),
    COALESCE(a.prev_conversations, 0),
    COALESCE(a.prev_leads, 0),
    COALESCE(a.prev_impressions, 0),
    COALESCE(a.prev_clicks, 0)
  FROM relevant_campaigns rc
  LEFT JOIN aggregated a ON a.campaign_id = rc.campaign_id
  ORDER BY rc.ad_account_id, COALESCE(a.curr_spend, 0) DESC;
$$;

-- Permissão pra invocar
GRANT EXECUTE ON FUNCTION public.get_campaign_monitoring(text[], date, date, date, date) TO authenticated;
