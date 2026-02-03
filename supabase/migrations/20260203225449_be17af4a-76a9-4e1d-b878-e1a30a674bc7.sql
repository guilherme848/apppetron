-- Create benchmarks configuration table for sales funnel
CREATE TABLE public.petron_funnel_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_key text NOT NULL UNIQUE,
  metric_label text NOT NULL,
  bad_threshold numeric NOT NULL,
  regular_threshold numeric NOT NULL,
  good_threshold numeric NOT NULL,
  is_percentage boolean NOT NULL DEFAULT true,
  is_higher_better boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.petron_funnel_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view benchmarks"
  ON public.petron_funnel_benchmarks
  FOR SELECT
  USING (true);

CREATE POLICY "Admins and commercial managers can manage benchmarks"
  ON public.petron_funnel_benchmarks
  FOR ALL
  USING (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM commercial_user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'commercial_manager')
    )
  )
  WITH CHECK (
    is_admin(auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM commercial_user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'commercial_manager')
    )
  );

-- Insert default benchmarks
INSERT INTO public.petron_funnel_benchmarks (metric_key, metric_label, bad_threshold, regular_threshold, good_threshold, is_percentage, is_higher_better) VALUES
  ('rate_scheduling', 'Taxa de Agendamento', 0.15, 0.25, 0.35, true, true),
  ('rate_attendance', 'Taxa de Comparecimento', 0.50, 0.65, 0.80, true, true),
  ('rate_close', 'Taxa de Conversão', 0.10, 0.18, 0.25, true, true),
  ('roas', 'ROAS', 2.0, 4.0, 6.0, false, true);

-- Trigger for updated_at
CREATE TRIGGER update_petron_funnel_benchmarks_updated_at
  BEFORE UPDATE ON public.petron_funnel_benchmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();