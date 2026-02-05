-- Add blocked_reason enum to traffic_playbook_tasks
ALTER TABLE public.traffic_playbook_tasks 
ADD COLUMN IF NOT EXISTS blocked_reason TEXT CHECK (
  blocked_reason IS NULL OR 
  blocked_reason IN ('waiting_creatives', 'waiting_approval', 'no_budget', 'access_issue', 'billing_issue', 'other')
);

-- Add blocked_at timestamp for tracking how long tasks have been blocked
ALTER TABLE public.traffic_playbook_tasks 
ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

-- Create trigger to set blocked_at when status changes to blocked
CREATE OR REPLACE FUNCTION public.trg_traffic_tasks_blocked_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'blocked' AND (OLD.status IS NULL OR OLD.status != 'blocked') THEN
    NEW.blocked_at := NOW();
  ELSIF NEW.status != 'blocked' AND OLD.status = 'blocked' THEN
    NEW.blocked_at := NULL;
    NEW.blocked_reason := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS traffic_tasks_blocked_at_trigger ON public.traffic_playbook_tasks;
CREATE TRIGGER traffic_tasks_blocked_at_trigger
  BEFORE UPDATE ON public.traffic_playbook_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_traffic_tasks_blocked_at();