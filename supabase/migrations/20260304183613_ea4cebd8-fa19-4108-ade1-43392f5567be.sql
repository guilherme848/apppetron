
-- Deal events/history table
CREATE TABLE public.crm_deal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- stage_changed, activity_completed, activity_created, field_changed, responsible_changed, score_changed, cadence_started, automation_executed, note_added
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_deal_events_deal_id ON public.crm_deal_events(deal_id);
CREATE INDEX idx_crm_deal_events_type ON public.crm_deal_events(event_type);

ALTER TABLE public.crm_deal_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deal events" ON public.crm_deal_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Deal files table
CREATE TABLE public.crm_deal_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_deal_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can manage deal files" ON public.crm_deal_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Contact custom fields (JSONB on existing table)
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS manychat_url TEXT;

-- Deal custom fields
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}';
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_form_id TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_form_name TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_ad_id TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_ad_name TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_campaign_id TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS fb_campaign_name TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS recovery_product_name TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS recovery_boleto_url TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS recovery_checkout_url TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS recovery_product_id TEXT;
ALTER TABLE public.crm_deals ADD COLUMN IF NOT EXISTS recovery_invoice_id TEXT;

-- Company fields on contacts
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS company_url TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS segment TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS company_instagram TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS monthly_revenue TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS company_phone TEXT;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Add cadence_step_id to templates
ALTER TABLE public.crm_templates ADD COLUMN IF NOT EXISTS cadence_step_id UUID REFERENCES public.crm_cadence_steps(id);
ALTER TABLE public.crm_templates ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '[]';

-- Storage bucket for deal files
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-files', 'crm-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can manage crm files" ON storage.objects
  FOR ALL TO authenticated 
  USING (bucket_id = 'crm-files') 
  WITH CHECK (bucket_id = 'crm-files');

-- Enable realtime for deal events
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deal_events;
