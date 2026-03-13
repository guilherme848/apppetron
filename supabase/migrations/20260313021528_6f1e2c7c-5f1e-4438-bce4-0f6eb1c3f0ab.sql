
-- Traffic Optimizations table
CREATE TABLE public.traffic_optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  platform TEXT NOT NULL DEFAULT 'meta_ads',
  task_type TEXT NOT NULL DEFAULT 'checkin',
  description TEXT,
  tempo_gasto_minutos INTEGER NOT NULL DEFAULT 5,
  checkin_saldo_ok BOOLEAN,
  checkin_campanhas_rodando BOOLEAN,
  checkin_alertas BOOLEAN,
  optimization_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Weekly cycle assignments (which client on which day for alta complexidade)
CREATE TABLE public.traffic_optimization_weekly_cycle (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  manager_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  weekday INTEGER NOT NULL CHECK (weekday >= 1 AND weekday <= 5),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, manager_member_id)
);

-- RLS
ALTER TABLE public.traffic_optimizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_optimization_weekly_cycle ENABLE ROW LEVEL SECURITY;

-- Policies for traffic_optimizations
CREATE POLICY "Authenticated users can view optimizations"
  ON public.traffic_optimizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert optimizations"
  ON public.traffic_optimizations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update optimizations"
  ON public.traffic_optimizations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete optimizations"
  ON public.traffic_optimizations FOR DELETE TO authenticated USING (true);

-- Policies for weekly cycle
CREATE POLICY "Authenticated users can view weekly cycle"
  ON public.traffic_optimization_weekly_cycle FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert weekly cycle"
  ON public.traffic_optimization_weekly_cycle FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update weekly cycle"
  ON public.traffic_optimization_weekly_cycle FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete weekly cycle"
  ON public.traffic_optimization_weekly_cycle FOR DELETE TO authenticated USING (true);

-- Index for performance
CREATE INDEX idx_traffic_optimizations_client ON public.traffic_optimizations(client_id);
CREATE INDEX idx_traffic_optimizations_member ON public.traffic_optimizations(member_id);
CREATE INDEX idx_traffic_optimizations_date ON public.traffic_optimizations(optimization_date);
CREATE INDEX idx_traffic_opt_weekly_manager ON public.traffic_optimization_weekly_cycle(manager_member_id);
