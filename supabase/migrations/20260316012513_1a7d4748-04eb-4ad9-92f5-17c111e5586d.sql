
-- Add transcription file fields to onboardings table
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_vendas_url text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_vendas_nome text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_vendas_tamanho integer;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_vendas_conteudo text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_vendas_uploaded_at timestamptz;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_onboarding_url text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_onboarding_nome text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_onboarding_tamanho integer;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_onboarding_conteudo text;
ALTER TABLE public.onboardings ADD COLUMN IF NOT EXISTS transcricao_onboarding_uploaded_at timestamptz;

-- Create storage bucket for onboarding transcriptions
INSERT INTO storage.buckets (id, name, public)
VALUES ('onboarding-transcricoes', 'onboarding-transcricoes', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload onboarding transcricoes"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'onboarding-transcricoes');

CREATE POLICY "Authenticated users can read onboarding transcricoes"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'onboarding-transcricoes');

CREATE POLICY "Authenticated users can update onboarding transcricoes"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'onboarding-transcricoes');

CREATE POLICY "Authenticated users can delete onboarding transcricoes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'onboarding-transcricoes');
