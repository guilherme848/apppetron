-- A) Create traffic_routines (master container)
CREATE TABLE public.traffic_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.traffic_routines ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to traffic_routines"
ON public.traffic_routines
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_traffic_routines_updated_at
BEFORE UPDATE ON public.traffic_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- B) traffic_cycles already exists and will be used as "detailed cycles"
-- No changes needed to traffic_cycles structure

-- C) Create traffic_routine_cycles junction table (routine contains cycles with frequency)
CREATE TABLE public.traffic_routine_cycles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.traffic_routines(id) ON DELETE CASCADE,
  cycle_id UUID NOT NULL REFERENCES public.traffic_cycles(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL, -- daily | weekly | biweekly | monthly | quarterly
  anchor_rule TEXT, -- ex: "weekday:mon", "day:1", "days:1,15", "quarter_start"
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(routine_id, cycle_id, frequency)
);

-- Enable RLS
ALTER TABLE public.traffic_routine_cycles ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow all access to traffic_routine_cycles"
ON public.traffic_routine_cycles
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_traffic_routine_cycles_updated_at
BEFORE UPDATE ON public.traffic_routine_cycles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- D) traffic_cycle_tasks already exists - no changes needed

-- E) Add traffic_routine_id to services (keep traffic_cycle_id for compatibility)
ALTER TABLE public.services
ADD COLUMN traffic_routine_id UUID REFERENCES public.traffic_routines(id);

-- F) Add traffic_routine_id to accounts for override
ALTER TABLE public.accounts
ADD COLUMN traffic_routine_id UUID REFERENCES public.traffic_routines(id);