-- Add unique constraint for upsert on ad_account_metrics_daily
ALTER TABLE ad_account_metrics_daily 
ADD CONSTRAINT ad_account_metrics_daily_account_date_platform_unique 
UNIQUE (ad_account_id, date, platform);