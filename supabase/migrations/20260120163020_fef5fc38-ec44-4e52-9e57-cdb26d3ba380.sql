-- Create traffic_cycle_routines table
CREATE TABLE public.traffic_cycle_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cycle_id UUID NOT NULL REFERENCES public.traffic_cycles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(cycle_id, frequency, name)
);

-- Create traffic_routine_tasks table
CREATE TABLE public.traffic_routine_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_id UUID NOT NULL REFERENCES public.traffic_cycle_routines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  details TEXT,
  default_priority TEXT NOT NULL DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'urgent')),
  due_offset_days INTEGER NOT NULL DEFAULT 0,
  task_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add routine_id to traffic_tasks (if not exists)
ALTER TABLE public.traffic_tasks 
ADD COLUMN IF NOT EXISTS routine_id UUID REFERENCES public.traffic_cycle_routines(id) ON DELETE SET NULL;

-- Enable RLS on new tables
ALTER TABLE public.traffic_cycle_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_routine_tasks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for traffic_cycle_routines
CREATE POLICY "Allow all access to traffic_cycle_routines" 
ON public.traffic_cycle_routines 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create RLS policies for traffic_routine_tasks
CREATE POLICY "Allow all access to traffic_routine_tasks" 
ON public.traffic_routine_tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create triggers for updated_at
CREATE TRIGGER update_traffic_cycle_routines_updated_at
BEFORE UPDATE ON public.traffic_cycle_routines
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_traffic_routine_tasks_updated_at
BEFORE UPDATE ON public.traffic_routine_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();