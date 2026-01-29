-- Update the trigger to start onboardings as 'in_progress' when a client is created
CREATE OR REPLACE FUNCTION public.trg_auto_create_onboarding()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Create onboarding record for new client with in_progress status
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
    NEW.cs_member_id,
    1,
    'in_progress',      -- Changed from 'not_started' to 'in_progress'
    'not_started',
    'not_started',
    'not_started',
    now()
  );
  
  RETURN NEW;
END;
$function$;

-- Also update existing onboardings that are 'not_started' to 'in_progress'
UPDATE public.cs_onboardings 
SET status = 'in_progress', updated_at = now()
WHERE status = 'not_started';