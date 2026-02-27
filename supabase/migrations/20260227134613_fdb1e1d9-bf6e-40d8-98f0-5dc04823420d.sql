
ALTER TABLE petron_sales_funnel_actuals ADD COLUMN IF NOT EXISTS mql_actual integer;
ALTER TABLE petron_sales_funnel_targets ADD COLUMN IF NOT EXISTS mql_target integer;
