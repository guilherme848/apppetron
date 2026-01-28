-- Tabela de transcrições de vendas
CREATE TABLE public.cs_sales_transcripts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transcript_text text NOT NULL,
  created_by_member_id uuid REFERENCES public.team_members(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Tabela de briefings de onboarding
CREATE TABLE public.cs_onboarding_briefings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transcript_id uuid REFERENCES public.cs_sales_transcripts(id) ON DELETE SET NULL,
  briefing_content jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_score integer,
  risk_level text CHECK (risk_level IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'approved')),
  cs_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cs_sales_transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_onboarding_briefings ENABLE ROW LEVEL SECURITY;

-- RLS Policies para cs_sales_transcripts
CREATE POLICY "Allow all access to cs_sales_transcripts" 
ON public.cs_sales_transcripts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- RLS Policies para cs_onboarding_briefings
CREATE POLICY "Allow all access to cs_onboarding_briefings" 
ON public.cs_onboarding_briefings 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_cs_onboarding_briefings_updated_at
BEFORE UPDATE ON public.cs_onboarding_briefings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_cs_sales_transcripts_client_id ON public.cs_sales_transcripts(client_id);
CREATE INDEX idx_cs_onboarding_briefings_client_id ON public.cs_onboarding_briefings(client_id);
CREATE INDEX idx_cs_onboarding_briefings_transcript_id ON public.cs_onboarding_briefings(transcript_id);