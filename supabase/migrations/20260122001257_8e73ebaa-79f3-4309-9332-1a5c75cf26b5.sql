-- Table for storing the single BM connection
CREATE TABLE public.meta_bm_connection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id TEXT NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for synced ad accounts from the BM
CREATE TABLE public.meta_bm_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  currency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table for financial snapshots
CREATE TABLE public.meta_ad_account_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_account_id TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  amount_spent NUMERIC,
  spend_cap NUMERIC,
  available_balance NUMERIC,
  raw_json JSONB
);

-- Junction table linking clients to ad accounts
CREATE TABLE public.client_meta_ad_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  ad_account_id TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(client_id, ad_account_id)
);

-- Enable RLS
ALTER TABLE public.meta_bm_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_bm_ad_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_meta_ad_accounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for now since this is internal tool)
CREATE POLICY "Allow all for meta_bm_connection" ON public.meta_bm_connection FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meta_bm_ad_accounts" ON public.meta_bm_ad_accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meta_ad_account_snapshots" ON public.meta_ad_account_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for client_meta_ad_accounts" ON public.client_meta_ad_accounts FOR ALL USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_meta_bm_connection_updated_at
  BEFORE UPDATE ON public.meta_bm_connection
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_bm_ad_accounts_updated_at
  BEFORE UPDATE ON public.meta_bm_ad_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster snapshot lookups
CREATE INDEX idx_meta_snapshots_ad_account ON public.meta_ad_account_snapshots(ad_account_id, fetched_at DESC);