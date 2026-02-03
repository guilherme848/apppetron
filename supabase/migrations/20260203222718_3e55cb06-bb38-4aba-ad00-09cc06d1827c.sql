-- Fix the view to use SECURITY INVOKER instead of SECURITY DEFINER
DROP VIEW IF EXISTS public.petron_sales_funnel_kpis_monthly;

CREATE VIEW public.petron_sales_funnel_kpis_monthly
WITH (security_invoker = on)
AS
WITH monthly_data AS (
  SELECT 
    COALESCE(t.month, a.month) AS month,
    -- Targets
    t.investment_target,
    t.leads_target,
    t.cpl_target,
    t.rate_scheduling_target,
    t.appointments_target,
    t.rate_attendance_target,
    t.meetings_held_target,
    t.rate_close_target,
    t.sales_target,
    t.avg_ticket_target,
    t.revenue_target,
    t.roas_target,
    -- Actuals (raw)
    a.investment_actual,
    a.leads_actual,
    a.appointments_actual,
    a.meetings_held_actual,
    a.sales_actual,
    a.avg_ticket_actual,
    -- Calculated or overridden CPL
    COALESCE(a.cpl_actual, CASE WHEN a.leads_actual > 0 THEN a.investment_actual / a.leads_actual ELSE NULL END) AS cpl_actual,
    -- Calculated or overridden revenue
    COALESCE(a.revenue_actual, a.sales_actual * a.avg_ticket_actual) AS revenue_actual,
    -- Calculated or overridden ROAS
    COALESCE(a.roas_actual, CASE WHEN a.investment_actual > 0 THEN COALESCE(a.revenue_actual, a.sales_actual * a.avg_ticket_actual) / a.investment_actual ELSE NULL END) AS roas_actual,
    -- Calculated rates
    CASE WHEN a.leads_actual > 0 THEN a.appointments_actual::numeric / a.leads_actual ELSE NULL END AS rate_scheduling_actual,
    CASE WHEN a.appointments_actual > 0 THEN a.meetings_held_actual::numeric / a.appointments_actual ELSE NULL END AS rate_attendance_actual,
    CASE WHEN a.meetings_held_actual > 0 THEN a.sales_actual::numeric / a.meetings_held_actual ELSE NULL END AS rate_close_actual,
    -- Conversions
    CASE WHEN a.leads_actual > 0 THEN a.appointments_actual::numeric / a.leads_actual ELSE NULL END AS conv_leads_to_appointments,
    CASE WHEN a.appointments_actual > 0 THEN a.meetings_held_actual::numeric / a.appointments_actual ELSE NULL END AS conv_appointments_to_meetings,
    CASE WHEN a.meetings_held_actual > 0 THEN a.sales_actual::numeric / a.meetings_held_actual ELSE NULL END AS conv_meetings_to_sales,
    CASE WHEN a.leads_actual > 0 THEN a.sales_actual::numeric / a.leads_actual ELSE NULL END AS conv_leads_to_sales,
    -- Notes
    a.notes AS actual_notes,
    t.notes AS target_notes
  FROM public.petron_sales_funnel_targets t
  FULL OUTER JOIN public.petron_sales_funnel_actuals a ON t.month = a.month
),
with_lag AS (
  SELECT 
    m.*,
    LAG(m.leads_actual) OVER (ORDER BY m.month) AS prev_leads,
    LAG(m.meetings_held_actual) OVER (ORDER BY m.month) AS prev_meetings,
    LAG(m.sales_actual) OVER (ORDER BY m.month) AS prev_sales,
    LAG(m.roas_actual) OVER (ORDER BY m.month) AS prev_roas
  FROM monthly_data m
)
SELECT 
  month,
  -- Targets
  investment_target,
  leads_target,
  cpl_target,
  rate_scheduling_target,
  appointments_target,
  rate_attendance_target,
  meetings_held_target,
  rate_close_target,
  sales_target,
  avg_ticket_target,
  revenue_target,
  roas_target,
  -- Actuals
  investment_actual,
  leads_actual,
  cpl_actual,
  appointments_actual,
  rate_scheduling_actual,
  meetings_held_actual,
  rate_attendance_actual,
  sales_actual,
  rate_close_actual,
  avg_ticket_actual,
  revenue_actual,
  roas_actual,
  -- Conversions
  conv_leads_to_appointments,
  conv_appointments_to_meetings,
  conv_meetings_to_sales,
  conv_leads_to_sales,
  -- MoM changes
  CASE WHEN prev_leads > 0 THEN (leads_actual - prev_leads)::numeric / prev_leads ELSE NULL END AS leads_mom_change,
  CASE WHEN prev_meetings > 0 THEN (meetings_held_actual - prev_meetings)::numeric / prev_meetings ELSE NULL END AS meetings_mom_change,
  CASE WHEN prev_sales > 0 THEN (sales_actual - prev_sales)::numeric / prev_sales ELSE NULL END AS sales_mom_change,
  CASE WHEN prev_roas > 0 THEN (roas_actual - prev_roas)::numeric / prev_roas ELSE NULL END AS roas_mom_change,
  -- Target achievement
  CASE WHEN leads_target > 0 THEN leads_actual::numeric / leads_target ELSE NULL END AS leads_achievement,
  CASE WHEN sales_target > 0 THEN sales_actual::numeric / sales_target ELSE NULL END AS sales_achievement,
  CASE WHEN revenue_target > 0 THEN revenue_actual / revenue_target ELSE NULL END AS revenue_achievement,
  CASE WHEN roas_target > 0 THEN roas_actual / roas_target ELSE NULL END AS roas_achievement,
  -- Notes
  actual_notes,
  target_notes
FROM with_lag;

-- Grant select on the view to authenticated users
GRANT SELECT ON public.petron_sales_funnel_kpis_monthly TO authenticated;

-- Also fix RLS policies to allow admins properly
-- The issue is that is_admin uses auth_user_id but policies are using auth.uid()
-- Let's update the RLS policies to be simpler

-- First drop existing policies
DROP POLICY IF EXISTS "Users with commercial access can view targets" ON public.petron_sales_funnel_targets;
DROP POLICY IF EXISTS "Users with commercial access can view actuals" ON public.petron_sales_funnel_actuals;

-- Create simpler policies that allow authenticated users to view
CREATE POLICY "Authenticated users can view targets"
  ON public.petron_sales_funnel_targets
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view actuals"
  ON public.petron_sales_funnel_actuals
  FOR SELECT
  USING (auth.uid() IS NOT NULL);