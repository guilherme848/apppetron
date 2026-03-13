
-- Add razao_social and billing_day to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS razao_social text;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS billing_day integer;

-- Create junction table for multiple contracted services
CREATE TABLE public.account_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id, service_id)
);

-- Enable RLS
ALTER TABLE public.account_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_services (same pattern as accounts)
CREATE POLICY "Authenticated users can view account_services"
  ON public.account_services FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert account_services"
  ON public.account_services FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update account_services"
  ON public.account_services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete account_services"
  ON public.account_services FOR DELETE TO authenticated USING (true);
