-- =============================================
-- CS ONBOARDINGS - Central Onboarding Tracking
-- =============================================

-- Create the central onboarding table
CREATE TABLE public.cs_onboardings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id) ON DELETE CASCADE,
  cs_owner_id UUID REFERENCES public.team_members(id),
  current_step INTEGER NOT NULL DEFAULT 1 CHECK (current_step BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
  step_1_status TEXT NOT NULL DEFAULT 'not_started' CHECK (step_1_status IN ('not_started', 'in_progress', 'completed')),
  step_2_status TEXT NOT NULL DEFAULT 'not_started' CHECK (step_2_status IN ('not_started', 'in_progress', 'completed')),
  step_3_status TEXT NOT NULL DEFAULT 'not_started' CHECK (step_3_status IN ('not_started', 'in_progress', 'completed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cs_onboardings ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Allow all access to cs_onboardings" ON public.cs_onboardings
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_cs_onboardings_updated_at
  BEFORE UPDATE ON public.cs_onboardings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Auto-create onboarding when client is created
-- =============================================

CREATE OR REPLACE FUNCTION public.trg_auto_create_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create onboarding record for new client
  INSERT INTO public.cs_onboardings (
    client_id,
    cs_owner_id,
    current_step,
    status,
    step_1_status,
    step_2_status,
    step_3_status,
    started_at
  ) VALUES (
    NEW.id,
    NEW.cs_member_id,  -- Use CS from account team if available
    1,
    'not_started',
    'not_started',
    'not_started',
    'not_started',
    now()
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger on accounts table
CREATE TRIGGER trg_accounts_auto_create_onboarding
  AFTER INSERT ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auto_create_onboarding();

-- =============================================
-- Function to update onboarding step status
-- =============================================

CREATE OR REPLACE FUNCTION public.update_onboarding_step(
  p_client_id UUID,
  p_step INTEGER,
  p_new_status TEXT
)
RETURNS public.cs_onboardings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_onboarding public.cs_onboardings;
BEGIN
  -- Update the specific step and recalculate overall status
  UPDATE public.cs_onboardings
  SET
    step_1_status = CASE WHEN p_step = 1 THEN p_new_status ELSE step_1_status END,
    step_2_status = CASE WHEN p_step = 2 THEN p_new_status ELSE step_2_status END,
    step_3_status = CASE WHEN p_step = 3 THEN p_new_status ELSE step_3_status END,
    current_step = CASE
      WHEN p_step = 1 AND p_new_status = 'completed' THEN GREATEST(current_step, 2)
      WHEN p_step = 2 AND p_new_status = 'completed' THEN GREATEST(current_step, 3)
      ELSE current_step
    END,
    status = CASE
      WHEN p_step = 3 AND p_new_status = 'completed' THEN 'completed'
      WHEN step_1_status = 'not_started' AND step_2_status = 'not_started' AND step_3_status = 'not_started' AND p_new_status = 'not_started' THEN 'not_started'
      ELSE 'in_progress'
    END,
    completed_at = CASE
      WHEN p_step = 3 AND p_new_status = 'completed' THEN now()
      ELSE completed_at
    END,
    updated_at = now()
  WHERE client_id = p_client_id
  RETURNING * INTO v_onboarding;
  
  RETURN v_onboarding;
END;
$$;

-- =============================================
-- Create onboardings for existing clients
-- =============================================

INSERT INTO public.cs_onboardings (client_id, cs_owner_id, current_step, status, step_1_status, step_2_status, step_3_status, started_at)
SELECT 
  a.id,
  a.cs_member_id,
  1,
  'not_started',
  'not_started',
  'not_started',
  'not_started',
  COALESCE(a.start_date, now())
FROM public.accounts a
WHERE a.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.cs_onboardings o WHERE o.client_id = a.id)
ON CONFLICT (client_id) DO NOTHING;