
-- Create loss_reasons table
CREATE TABLE public.crm_loss_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_loss_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read loss reasons"
  ON public.crm_loss_reasons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage loss reasons"
  ON public.crm_loss_reasons FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- Add loss_reason_id to crm_deals
ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS loss_reason_id UUID REFERENCES public.crm_loss_reasons(id),
  ADD COLUMN IF NOT EXISTS lost_at TIMESTAMPTZ;

-- Insert default loss reasons
INSERT INTO public.crm_loss_reasons (name) VALUES
  ('Preço'),
  ('Concorrência'),
  ('Sem interesse'),
  ('Sem verba'),
  ('Timing'),
  ('Não respondeu'),
  ('Outro');

-- Enable realtime for deals and activities for live dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_loss_reasons;
