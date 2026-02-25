DROP VIEW IF EXISTS public.petron_sales_funnel_kpis_monthly;

CREATE VIEW public.petron_sales_funnel_kpis_monthly
WITH (security_invoker = on) AS
WITH client_sales AS (
  SELECT 
    date_trunc('month', start_date::date)::date AS month,
    count(*)::integer AS sales_count,
    COALESCE(sum(monthly_value), 0)::numeric(15,2) AS total_revenue,
    (CASE WHEN count(*) > 0 THEN sum(monthly_value) / count(*) ELSE 0 END)::numeric(15,2) AS avg_ticket
  FROM accounts
  WHERE start_date IS NOT NULL AND deleted_at IS NULL
  GROUP BY 1
),
monthly_data AS (
  SELECT 
    COALESCE(t.month, a.month, cs.month) AS month,
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
    a.investment_actual,
    a.leads_actual,
    a.appointments_actual,
    a.meetings_held_actual,
    COALESCE(cs.sales_count, a.sales_actual) AS sales_actual,
    COALESCE(cs.avg_ticket, a.avg_ticket_actual)::numeric(15,2) AS avg_ticket_actual,
    COALESCE(a.cpl_actual,
      CASE WHEN a.leads_actual > 0 THEN a.investment_actual / a.leads_actual::numeric ELSE NULL END
    ) AS cpl_actual,
    COALESCE(cs.total_revenue, a.revenue_actual, a.sales_actual::numeric * a.avg_ticket_actual)::numeric(15,2) AS revenue_actual,
    COALESCE(
      CASE WHEN a.investment_actual > 0 THEN COALESCE(cs.total_revenue, a.revenue_actual, a.sales_actual::numeric * a.avg_ticket_actual) / a.investment_actual ELSE NULL END,
      a.roas_actual
    ) AS roas_actual,
    CASE WHEN a.leads_actual > 0 THEN a.appointments_actual::numeric / a.leads_actual::numeric ELSE NULL END AS rate_scheduling_actual,
    CASE WHEN a.appointments_actual > 0 THEN a.meetings_held_actual::numeric / a.appointments_actual::numeric ELSE NULL END AS rate_attendance_actual,
    CASE WHEN a.meetings_held_actual > 0 THEN COALESCE(cs.sales_count, a.sales_actual)::numeric / a.meetings_held_actual::numeric ELSE NULL END AS rate_close_actual,
    CASE WHEN a.leads_actual > 0 THEN a.appointments_actual::numeric / a.leads_actual::numeric ELSE NULL END AS conv_leads_to_appointments,
    CASE WHEN a.appointments_actual > 0 THEN a.meetings_held_actual::numeric / a.appointments_actual::numeric ELSE NULL END AS conv_appointments_to_meetings,
    CASE WHEN a.meetings_held_actual > 0 THEN COALESCE(cs.sales_count, a.sales_actual)::numeric / a.meetings_held_actual::numeric ELSE NULL END AS conv_meetings_to_sales,
    CASE WHEN a.leads_actual > 0 THEN COALESCE(cs.sales_count, a.sales_actual)::numeric / a.leads_actual::numeric ELSE NULL END AS conv_leads_to_sales,
    a.notes AS actual_notes,
    t.notes AS target_notes
  FROM petron_sales_funnel_targets t
  FULL JOIN petron_sales_funnel_actuals a ON t.month = a.month
  FULL JOIN client_sales cs ON COALESCE(t.month, a.month) = cs.month
),
with_lag AS (
  SELECT m.*,
    lag(m.leads_actual) OVER (ORDER BY m.month) AS prev_leads,
    lag(m.meetings_held_actual) OVER (ORDER BY m.month) AS prev_meetings,
    lag(m.sales_actual) OVER (ORDER BY m.month) AS prev_sales,
    lag(m.roas_actual) OVER (ORDER BY m.month) AS prev_roas
  FROM monthly_data m
)
SELECT 
  month,
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
  conv_leads_to_appointments,
  conv_appointments_to_meetings,
  conv_meetings_to_sales,
  conv_leads_to_sales,
  CASE WHEN prev_leads > 0 THEN (leads_actual - prev_leads)::numeric / prev_leads ELSE NULL END AS leads_mom_change,
  CASE WHEN prev_meetings > 0 THEN (meetings_held_actual - prev_meetings)::numeric / prev_meetings ELSE NULL END AS meetings_mom_change,
  CASE WHEN prev_sales > 0 THEN (sales_actual - prev_sales)::numeric / prev_sales ELSE NULL END AS sales_mom_change,
  CASE WHEN prev_roas > 0 THEN (roas_actual - prev_roas) / prev_roas ELSE NULL END AS roas_mom_change,
  CASE WHEN leads_target > 0 THEN leads_actual::numeric / leads_target ELSE NULL END AS leads_achievement,
  CASE WHEN sales_target > 0 THEN sales_actual::numeric / sales_target ELSE NULL END AS sales_achievement,
  CASE WHEN revenue_target > 0 THEN revenue_actual / revenue_target ELSE NULL END AS revenue_achievement,
  CASE WHEN roas_target > 0 THEN roas_actual / roas_target ELSE NULL END AS roas_achievement,
  actual_notes,
  target_notes
FROM with_lag;