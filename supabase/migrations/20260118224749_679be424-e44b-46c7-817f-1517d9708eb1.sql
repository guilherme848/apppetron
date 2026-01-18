-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policy for services
CREATE POLICY "Allow all access to services" ON public.services FOR ALL USING (true) WITH CHECK (true);

-- Create niches table
CREATE TABLE IF NOT EXISTS public.niches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.niches ENABLE ROW LEVEL SECURITY;

-- Create policy for niches
CREATE POLICY "Allow all access to niches" ON public.niches FOR ALL USING (true) WITH CHECK (true);

-- Add foreign key columns to accounts (keeping old text columns for compatibility)
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.services(id) ON DELETE SET NULL;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS niche_id UUID REFERENCES public.niches(id) ON DELETE SET NULL;

-- Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_accounts_service_id ON public.accounts(service_id);
CREATE INDEX IF NOT EXISTS idx_accounts_niche_id ON public.accounts(niche_id);