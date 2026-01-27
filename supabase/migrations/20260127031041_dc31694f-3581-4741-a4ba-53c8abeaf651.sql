-- ============================================
-- TRAFFIC PERFORMANCE ANALYTICS MODULE
-- ============================================

-- 1. Daily metrics storage per ad account
CREATE TABLE public.ad_account_metrics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_account_id text NOT NULL,
  platform text NOT NULL DEFAULT 'meta',
  date date NOT NULL,
  metrics_json jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (ad_account_id, platform, date)
);

-- 2. Configurable metric catalog
CREATE TABLE public.traffic_metric_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'entrega',
  unit text NOT NULL DEFAULT 'NUMBER',
  source text NOT NULL DEFAULT 'meta',
  metric_type text NOT NULL DEFAULT 'simple',
  formula text,
  dependencies jsonb,
  availability_objectives jsonb,
  availability_platforms jsonb,
  visible_for_managers boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  default_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. Metric targets and thresholds (traffic light)
CREATE TABLE public.traffic_metric_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_slug text NOT NULL REFERENCES public.traffic_metric_catalog(slug) ON DELETE CASCADE,
  scope text NOT NULL DEFAULT 'global',
  niche_id uuid REFERENCES public.niches(id) ON DELETE CASCADE,
  objective text,
  invest_min numeric,
  invest_max numeric,
  better_when text NOT NULL DEFAULT 'lower',
  green_min numeric,
  green_max numeric,
  yellow_min numeric,
  yellow_max numeric,
  red_min numeric,
  red_max numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. Composite score configuration
CREATE TABLE public.traffic_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  config_json jsonb NOT NULL DEFAULT '{"metrics":[],"normalize_by":"benchmark_global","clamp":[0,100]}',
  green_threshold integer NOT NULL DEFAULT 75,
  yellow_threshold integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. Alert rules
CREATE TABLE public.traffic_alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric_slug text NOT NULL REFERENCES public.traffic_metric_catalog(slug) ON DELETE CASCADE,
  condition text NOT NULL DEFAULT 'gt',
  threshold numeric,
  window_days integer NOT NULL DEFAULT 7,
  severity text NOT NULL DEFAULT 'attention',
  message text NOT NULL,
  action_hint text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Dashboard layout configuration
CREATE TABLE public.traffic_dashboard_layout (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'global',
  objective text,
  cards jsonb NOT NULL DEFAULT '[]',
  columns jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (scope, objective)
);

-- 7. Saved views per user
CREATE TABLE public.traffic_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  name text NOT NULL,
  filters_json jsonb NOT NULL DEFAULT '{}',
  columns_json jsonb NOT NULL DEFAULT '[]',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.ad_account_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_metric_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_metric_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_dashboard_layout ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ad_account_metrics_daily
CREATE POLICY "Allow all access to ad_account_metrics_daily"
ON public.ad_account_metrics_daily FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_metric_catalog
CREATE POLICY "Allow all access to traffic_metric_catalog"
ON public.traffic_metric_catalog FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_metric_targets
CREATE POLICY "Allow all access to traffic_metric_targets"
ON public.traffic_metric_targets FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_scores
CREATE POLICY "Allow all access to traffic_scores"
ON public.traffic_scores FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_alert_rules
CREATE POLICY "Allow all access to traffic_alert_rules"
ON public.traffic_alert_rules FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_dashboard_layout
CREATE POLICY "Allow all access to traffic_dashboard_layout"
ON public.traffic_dashboard_layout FOR ALL
USING (true) WITH CHECK (true);

-- RLS Policies for traffic_saved_views
CREATE POLICY "Allow all access to traffic_saved_views"
ON public.traffic_saved_views FOR ALL
USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_ad_account_metrics_daily_account_date ON public.ad_account_metrics_daily(ad_account_id, date DESC);
CREATE INDEX idx_ad_account_metrics_daily_platform ON public.ad_account_metrics_daily(platform);
CREATE INDEX idx_traffic_metric_catalog_active ON public.traffic_metric_catalog(is_active);
CREATE INDEX idx_traffic_metric_targets_scope ON public.traffic_metric_targets(scope, metric_slug);
CREATE INDEX idx_traffic_saved_views_user ON public.traffic_saved_views(user_id);

-- Trigger for updated_at on traffic_metric_catalog
CREATE TRIGGER update_traffic_metric_catalog_updated_at
BEFORE UPDATE ON public.traffic_metric_catalog
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on traffic_metric_targets
CREATE TRIGGER update_traffic_metric_targets_updated_at
BEFORE UPDATE ON public.traffic_metric_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on traffic_scores
CREATE TRIGGER update_traffic_scores_updated_at
BEFORE UPDATE ON public.traffic_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on traffic_alert_rules
CREATE TRIGGER update_traffic_alert_rules_updated_at
BEFORE UPDATE ON public.traffic_alert_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on traffic_dashboard_layout
CREATE TRIGGER update_traffic_dashboard_layout_updated_at
BEFORE UPDATE ON public.traffic_dashboard_layout
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default metrics catalog
INSERT INTO public.traffic_metric_catalog (name, slug, description, category, unit, source, metric_type, formula, dependencies, availability_objectives, default_order)
VALUES
  ('Gasto Total', 'spend', 'Valor total gasto no período', 'custo', 'BRL', 'meta', 'simple', NULL, NULL, NULL, 1),
  ('Impressões', 'impressions', 'Número total de impressões', 'entrega', 'NUMBER', 'meta', 'simple', NULL, NULL, NULL, 2),
  ('Alcance', 'reach', 'Número de pessoas únicas alcançadas', 'entrega', 'NUMBER', 'meta', 'simple', NULL, NULL, NULL, 3),
  ('Cliques no Link', 'link_clicks', 'Cliques em links do anúncio', 'clique', 'NUMBER', 'meta', 'simple', NULL, NULL, NULL, 4),
  ('CPM', 'cpm', 'Custo por mil impressões', 'custo', 'BRL', 'meta', 'calculated', 'spend / impressions * 1000', '["spend","impressions"]', NULL, 5),
  ('CTR Link', 'ctr_link', 'Taxa de cliques no link', 'clique', 'PERCENT', 'meta', 'calculated', 'link_clicks / impressions * 100', '["link_clicks","impressions"]', NULL, 6),
  ('CPC Link', 'cpc_link', 'Custo por clique no link', 'custo', 'BRL', 'meta', 'calculated', 'spend / link_clicks', '["spend","link_clicks"]', NULL, 7),
  ('Conversões', 'conversions', 'Total de conversões (leads, compras, etc.)', 'conversao', 'NUMBER', 'meta', 'simple', NULL, NULL, NULL, 8),
  ('CPA', 'cpa', 'Custo por aquisição/conversão', 'custo', 'BRL', 'meta', 'calculated', 'spend / conversions', '["spend","conversions"]', NULL, 9),
  ('Cliques WhatsApp', 'whatsapp_clicks', 'Cliques em botão de WhatsApp', 'conversao', 'NUMBER', 'meta', 'simple', NULL, NULL, '["whatsapp"]', 10),
  ('CPWA', 'cpwa', 'Custo por clique WhatsApp', 'custo', 'BRL', 'meta', 'calculated', 'spend / whatsapp_clicks', '["spend","whatsapp_clicks"]', '["whatsapp"]', 11),
  ('Frequência', 'frequency', 'Média de vezes que cada pessoa viu o anúncio', 'entrega', 'NUMBER', 'meta', 'calculated', 'impressions / reach', '["impressions","reach"]', NULL, 12),
  ('Compras', 'purchases', 'Número de compras realizadas', 'conversao', 'NUMBER', 'meta', 'simple', NULL, NULL, '["purchase"]', 13),
  ('ROAS', 'roas', 'Retorno sobre o investimento em anúncios', 'conversao', 'NUMBER', 'meta', 'calculated', 'purchase_value / spend', '["purchase_value","spend"]', '["purchase"]', 14),
  ('Valor de Compra', 'purchase_value', 'Valor total das compras', 'conversao', 'BRL', 'meta', 'simple', NULL, NULL, '["purchase"]', 15);

-- Insert default global score
INSERT INTO public.traffic_scores (name, config_json, green_threshold, yellow_threshold, is_active)
VALUES (
  'Score Petron — Tráfego',
  '{"metrics":[{"slug":"cpm","weight":20},{"slug":"ctr_link","weight":25},{"slug":"cpc_link","weight":25},{"slug":"cpa","weight":30}],"normalize_by":"benchmark_global","clamp":[0,100]}',
  75,
  50,
  true
);

-- Insert default dashboard layout
INSERT INTO public.traffic_dashboard_layout (scope, objective, cards, columns)
VALUES (
  'global',
  NULL,
  '[{"slug":"spend","label":"Gasto Total"},{"slug":"impressions","label":"Impressões"},{"slug":"link_clicks","label":"Cliques"},{"slug":"cpm","label":"CPM"}]',
  '[{"slug":"spend","pinned":true,"order":1},{"slug":"impressions","order":2},{"slug":"cpm","order":3},{"slug":"ctr_link","order":4},{"slug":"cpc_link","order":5}]'
);

-- Insert default alert rules
INSERT INTO public.traffic_alert_rules (name, metric_slug, condition, threshold, window_days, severity, message, action_hint)
VALUES
  ('CPM Alto', 'cpm', 'gt', 50, 7, 'attention', 'CPM acima do esperado', 'Revisar segmentação ou criativos'),
  ('CTR Baixo', 'ctr_link', 'lt', 0.5, 7, 'attention', 'CTR abaixo de 0.5%', 'Testar novos criativos ou copy'),
  ('Gasto Zero', 'spend', 'lt', 1, 3, 'critical', 'Sem veiculação', 'Verificar campanhas pausadas ou problemas de pagamento');