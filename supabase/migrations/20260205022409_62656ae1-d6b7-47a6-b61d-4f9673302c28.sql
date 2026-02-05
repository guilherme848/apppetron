-- Fix the function with simpler approach (avoid array syntax issues)
CREATE OR REPLACE FUNCTION public.assign_balanced_weekly_workday()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day integer;
  v_min_count integer;
  v_count integer;
BEGIN
  v_min_count := 999999;
  v_day := 2; -- default Tuesday
  
  -- Check each weekday (1-5) and find the one with least clients
  FOR i IN 1..5 LOOP
    SELECT COUNT(*) INTO v_count
    FROM traffic_client_status
    WHERE weekly_workday = i;
    
    IF v_count < v_min_count THEN
      v_min_count := v_count;
      v_day := i;
    END IF;
  END LOOP;
  
  RETURN v_day;
END;
$function$;