-- Add payment method field to accounts table
ALTER TABLE public.accounts 
ADD COLUMN IF NOT EXISTS ad_payment_method text;

-- Add comment for documentation
COMMENT ON COLUMN public.accounts.ad_payment_method IS 'Payment method for ads: pix, boleto, or cartao';