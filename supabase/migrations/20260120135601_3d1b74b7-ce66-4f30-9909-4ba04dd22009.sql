-- Criar tabela de catálogo de entregáveis
CREATE TABLE public.deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  unit TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.deliverables ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all access to deliverables" 
ON public.deliverables 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Criar tabela de entregáveis por serviço/plano
CREATE TABLE public.service_deliverables (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  deliverable_id UUID NOT NULL REFERENCES public.deliverables(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, deliverable_id)
);

-- Habilitar RLS
ALTER TABLE public.service_deliverables ENABLE ROW LEVEL SECURITY;

-- Política de acesso
CREATE POLICY "Allow all access to service_deliverables" 
ON public.service_deliverables 
FOR ALL 
USING (true) 
WITH CHECK (true);