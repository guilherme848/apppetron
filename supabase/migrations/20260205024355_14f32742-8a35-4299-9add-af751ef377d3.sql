-- 1) Create view for weekly load calculation per day
CREATE OR REPLACE VIEW public.traffic_weekly_load_by_day WITH (security_invoker = on) AS
WITH client_weights AS (
  SELECT 
    a.id AS client_id,
    a.service_id AS plan_id,
    COALESCE(tcs.weekly_workday, 2) AS weekly_workday,
    COALESCE(tcs.weekly_workday_locked, false) AS weekly_workday_locked,
    tcs.weekly_assigned_at,
    COUNT(tpt.id) FILTER (
      WHERE tpt.cadence = 'weekly' 
      AND tpt.active = true
      AND NOT EXISTS (
        SELECT 1 FROM traffic_playbook_overrides tpo
        WHERE tpo.client_id = a.id 
        AND tpo.template_id = tpt.id 
        AND tpo.is_disabled = true
      )
    ) AS weight
  FROM accounts a
  LEFT JOIN traffic_client_status tcs ON tcs.client_id = a.id
  LEFT JOIN traffic_playbook_templates tpt ON tpt.service_id = a.service_id
  WHERE a.status = 'active' AND a.deleted_at IS NULL
  GROUP BY a.id, a.service_id, tcs.weekly_workday, tcs.weekly_workday_locked, tcs.weekly_assigned_at
),
day_loads AS (
  SELECT 
    weekly_workday AS weekday,
    SUM(weight)::integer AS total_load,
    COUNT(*)::integer AS client_count
  FROM client_weights
  GROUP BY weekly_workday
)
SELECT 
  weekday,
  COALESCE(total_load, 0) AS total_load,
  COALESCE(client_count, 0) AS client_count
FROM day_loads
ORDER BY weekday;

-- 2) Create function to get client weight
CREATE OR REPLACE FUNCTION public.get_client_weekly_weight(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_weight integer;
BEGIN
  SELECT COUNT(tpt.id)::integer
  INTO v_weight
  FROM accounts a
  JOIN traffic_playbook_templates tpt ON tpt.service_id = a.service_id
  WHERE a.id = p_client_id
    AND tpt.cadence = 'weekly'
    AND tpt.active = true
    AND NOT EXISTS (
      SELECT 1 FROM traffic_playbook_overrides tpo
      WHERE tpo.client_id = a.id 
      AND tpo.template_id = tpt.id 
      AND tpo.is_disabled = true
    );
  
  RETURN COALESCE(v_weight, 0);
END;
$function$;

-- 3) Create function to assign optimal workday for a client
CREATE OR REPLACE FUNCTION public.assign_optimal_weekly_workday(p_client_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_day integer;
  v_optimal_day integer;
BEGIN
  -- Check if client already has a workday assigned
  SELECT weekly_workday INTO v_existing_day
  FROM traffic_client_status
  WHERE client_id = p_client_id;
  
  -- If already assigned, return it
  IF v_existing_day IS NOT NULL THEN
    RETURN v_existing_day;
  END IF;
  
  -- Find optimal day (lowest load, tiebreaker: lowest client count)
  WITH current_loads AS (
    SELECT 
      d.day AS weekday,
      COALESCE(SUM(public.get_client_weekly_weight(tcs.client_id)), 0) AS total_load,
      COUNT(tcs.client_id) AS client_count
    FROM (VALUES (1),(2),(3),(4),(5)) AS d(day)
    LEFT JOIN traffic_client_status tcs ON tcs.weekly_workday = d.day
    LEFT JOIN accounts a ON a.id = tcs.client_id AND a.status = 'active' AND a.deleted_at IS NULL
    GROUP BY d.day
  )
  SELECT weekday INTO v_optimal_day
  FROM current_loads
  ORDER BY total_load ASC, client_count ASC
  LIMIT 1;
  
  v_optimal_day := COALESCE(v_optimal_day, 2);
  
  -- Upsert client status with optimal day
  INSERT INTO traffic_client_status (client_id, campaign_status, weekly_workday, weekly_assigned_at)
  VALUES (p_client_id, 'active', v_optimal_day, now())
  ON CONFLICT (client_id) DO UPDATE SET
    weekly_workday = EXCLUDED.weekly_workday,
    weekly_assigned_at = now();
  
  RETURN v_optimal_day;
END;
$function$;

-- 4) Update the trigger function to use weighted assignment
CREATE OR REPLACE FUNCTION public.assign_balanced_weekly_workday()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day integer;
BEGIN
  WITH current_loads AS (
    SELECT 
      d.day AS weekday,
      COALESCE(SUM(public.get_client_weekly_weight(tcs.client_id)), 0) AS total_load,
      COUNT(tcs.client_id) AS client_count
    FROM (VALUES (1),(2),(3),(4),(5)) AS d(day)
    LEFT JOIN traffic_client_status tcs ON tcs.weekly_workday = d.day
    LEFT JOIN accounts a ON a.id = tcs.client_id AND a.status = 'active' AND a.deleted_at IS NULL
    GROUP BY d.day
  )
  SELECT weekday INTO v_day
  FROM current_loads
  ORDER BY total_load ASC, client_count ASC
  LIMIT 1;
  
  RETURN COALESCE(v_day, 2);
END;
$function$;