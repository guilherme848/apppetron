-- Step 1: Add missing columns to traffic_client_status
ALTER TABLE public.traffic_client_status
ADD COLUMN IF NOT EXISTS weekly_workday integer NOT NULL DEFAULT 2 CHECK (weekly_workday >= 1 AND weekly_workday <= 5),
ADD COLUMN IF NOT EXISTS weekly_workday_locked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS weekly_assigned_at timestamptz DEFAULT now();