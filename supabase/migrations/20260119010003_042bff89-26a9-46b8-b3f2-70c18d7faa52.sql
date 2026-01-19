-- Add churned_at column to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS churned_at date;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.churned_at IS 'Date when the client churned (status changed to churned)';