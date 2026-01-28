-- Configuration table for Base Health Score
CREATE TABLE public.base_health_score_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Score Saúde da Base',
  components JSONB NOT NULL DEFAULT '[
    {"key": "churn_rate", "weight": 30, "label": "Taxa de Churn"},
    {"key": "avg_lt_active", "weight": 25, "label": "LT Médio (Ativos)"},
    {"key": "cohort_retention", "weight": 25, "label": "Retenção Cohort"},
    {"key": "base_distribution", "weight": 20, "label": "Distribuição da Base"}
  ]'::jsonb,
  normalization_rules JSONB NOT NULL DEFAULT '{
    "churn_rate": {"excellent": 2, "good": 4, "warning": 6, "critical": 8},
    "avg_lt_active": {"excellent": 24, "good": 12, "warning": 6, "critical": 3},
    "cohort_retention": {"excellent": 90, "good": 75, "warning": 60, "critical": 40},
    "base_distribution": {"max_plan_concentration": 50, "max_niche_concentration": 40, "min_mature_lt_months": 3}
  }'::jsonb,
  green_threshold INTEGER NOT NULL DEFAULT 75,
  yellow_threshold INTEGER NOT NULL DEFAULT 55,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- History table for tracking score over time
CREATE TABLE public.base_health_score_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES public.base_health_score_config(id) ON DELETE SET NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  score_value NUMERIC NOT NULL,
  components_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.base_health_score_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.base_health_score_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - Allow authenticated users to view
CREATE POLICY "Authenticated users can view base_health_score_config"
ON public.base_health_score_config FOR SELECT
USING (true);

CREATE POLICY "Admins can manage base_health_score_config"
ON public.base_health_score_config FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view base_health_score_history"
ON public.base_health_score_history FOR SELECT
USING (true);

CREATE POLICY "Admins can manage base_health_score_history"
ON public.base_health_score_history FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Insert default configuration
INSERT INTO public.base_health_score_config (name) VALUES ('Score Saúde da Base – Petron');

-- Trigger for updated_at
CREATE TRIGGER update_base_health_score_config_updated_at
BEFORE UPDATE ON public.base_health_score_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for history queries
CREATE INDEX idx_base_health_score_history_period ON public.base_health_score_history(period_start, period_end);
CREATE INDEX idx_base_health_score_history_created ON public.base_health_score_history(created_at DESC);