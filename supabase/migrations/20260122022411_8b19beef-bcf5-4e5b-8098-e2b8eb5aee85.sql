-- Add monthly budget and payment frequency fields to accounts
ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS ad_monthly_budget numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS ad_payment_frequency text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.ad_monthly_budget IS 'Monthly media budget in BRL';
COMMENT ON COLUMN public.accounts.ad_payment_frequency IS 'Payment frequency: weekly, biweekly, or monthly';