-- =============================================
-- MÓDULO DE CONTRATOS AUTOMATIZADOS
-- =============================================

-- Tabela de templates de contrato
CREATE TABLE public.contract_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  is_default_for_plan BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Versões de templates (versionamento)
CREATE TABLE public.contract_template_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  content_html TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_by_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, version_number)
);

-- Campos dinâmicos dos templates
CREATE TABLE public.contract_template_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.contract_templates(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- text, number, date, currency, calculated
  default_value TEXT,
  source_mapping TEXT, -- ex: 'account.name', 'account.cpf_cnpj', 'webhook.discount'
  is_required BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(template_id, field_key)
);

-- Contratos gerados
CREATE TABLE public.contracts_generated (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_number TEXT NOT NULL UNIQUE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
  template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  template_version_id UUID REFERENCES public.contract_template_versions(id) ON DELETE SET NULL,
  
  -- Status do contrato
  status TEXT NOT NULL DEFAULT 'draft', -- draft, generated, sent, signing, signed, refused, expired, canceled
  
  -- Campos preenchidos (snapshot)
  fields_snapshot JSONB NOT NULL DEFAULT '{}',
  
  -- Valores do contrato
  mrr NUMERIC,
  setup_fee NUMERIC DEFAULT 0,
  total_first_month NUMERIC,
  contract_start_date DATE,
  contract_end_date DATE,
  
  -- Integração com provedor de assinatura
  external_provider TEXT, -- 'autentique' | 'clicksign'
  external_document_id TEXT,
  external_signing_url TEXT,
  
  -- Origem do contrato
  source TEXT NOT NULL DEFAULT 'manual', -- 'manual' | 'clint'
  source_event_id TEXT UNIQUE, -- idempotência
  
  -- Hash do documento para verificação
  document_hash TEXT,
  
  -- Timestamps
  generated_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Signatários do contrato
CREATE TABLE public.contract_signers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts_generated(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  cpf TEXT,
  role TEXT NOT NULL DEFAULT 'signer', -- 'signer' | 'witness' | 'approver'
  sign_order INTEGER NOT NULL DEFAULT 1,
  external_signer_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'signed' | 'refused'
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Arquivos do contrato (PDF gerado, PDF assinado)
CREATE TABLE public.contract_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts_generated(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL, -- 'generated_pdf' | 'signed_pdf' | 'attachment'
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  document_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos/timeline do contrato
CREATE TABLE public.contract_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES public.contracts_generated(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'created', 'generated', 'sent', 'viewed', 'signed', 'refused', 'expired', 'canceled', 'webhook_received'
  event_description TEXT,
  actor_type TEXT, -- 'system' | 'user' | 'webhook' | 'signer'
  actor_id TEXT,
  actor_name TEXT,
  payload_original JSONB,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Eventos do webhook Clint (para idempotência e auditoria)
CREATE TABLE public.clint_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  payload JSONB NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'received', -- 'received' | 'processed' | 'failed' | 'skipped'
  error TEXT,
  contract_id UUID REFERENCES public.contracts_generated(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_contracts_generated_account ON public.contracts_generated(account_id);
CREATE INDEX idx_contracts_generated_status ON public.contracts_generated(status);
CREATE INDEX idx_contracts_generated_source ON public.contracts_generated(source);
CREATE INDEX idx_contracts_generated_external_doc ON public.contracts_generated(external_document_id);
CREATE INDEX idx_contract_events_contract ON public.contract_events(contract_id);
CREATE INDEX idx_contract_events_type ON public.contract_events(event_type);
CREATE INDEX idx_clint_webhook_events_source ON public.clint_webhook_events(source_event_id);
CREATE INDEX idx_clint_webhook_events_status ON public.clint_webhook_events(status);

-- Trigger para updated_at
CREATE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_generated_updated_at
  BEFORE UPDATE ON public.contracts_generated
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para gerar número do contrato
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(contract_number FROM 'CT-' || v_year || '-(\d+)') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM contracts_generated
  WHERE contract_number LIKE 'CT-' || v_year || '-%';
  
  v_number := 'CT-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
  
  RETURN v_number;
END;
$$;

-- Enable RLS
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts_generated ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clint_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to contract_templates" ON public.contract_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contract_template_versions" ON public.contract_template_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contract_template_fields" ON public.contract_template_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contracts_generated" ON public.contracts_generated FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contract_signers" ON public.contract_signers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contract_files" ON public.contract_files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contract_events" ON public.contract_events FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to clint_webhook_events" ON public.clint_webhook_events FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket para contratos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('contracts', 'contracts', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage para contratos
CREATE POLICY "Authenticated users can view contract files"
ON storage.objects FOR SELECT
USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload contract files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

CREATE POLICY "Service role can manage contract files"
ON storage.objects FOR ALL
USING (bucket_id = 'contracts')
WITH CHECK (bucket_id = 'contracts');