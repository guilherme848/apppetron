-- Adicionar novas colunas à tabela accounts

-- Dados do cliente
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS niche TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT;

-- Contrato
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS service_contracted TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2) CHECK (monthly_value IS NULL OR monthly_value >= 0);
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS start_date DATE;

-- Contato
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Endereço
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS street TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS street_number TEXT;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS address_complement TEXT;

-- Adicionar updated_at se não existir
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Criar trigger para atualizar updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para CPF/CNPJ (opcional, para buscas)
CREATE INDEX IF NOT EXISTS idx_accounts_cpf_cnpj ON public.accounts(cpf_cnpj);