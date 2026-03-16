
-- Links úteis do cliente
CREATE TABLE IF NOT EXISTS public.cliente_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  label text,
  url text NOT NULL,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Concorrentes do cliente
CREATE TABLE IF NOT EXISTS public.cliente_concorrentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nome text NOT NULL,
  instagram_url text,
  site_url text,
  observacoes text,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Anexos do cliente
CREATE TABLE IF NOT EXISTS public.cliente_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho integer,
  descricao text,
  uploaded_by uuid REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now()
);

-- Índices para busca rápida
CREATE INDEX IF NOT EXISTS idx_cliente_links ON public.cliente_links(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_concorrentes ON public.cliente_concorrentes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_anexos ON public.cliente_anexos(cliente_id);

-- RLS
ALTER TABLE public.cliente_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_concorrentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cliente_anexos ENABLE ROW LEVEL SECURITY;

-- Policies for authenticated users
CREATE POLICY "Authenticated users can manage cliente_links"
  ON public.cliente_links FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage cliente_concorrentes"
  ON public.cliente_concorrentes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can manage cliente_anexos"
  ON public.cliente_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('cliente-anexos', 'cliente-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy
CREATE POLICY "Authenticated users can manage cliente-anexos"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'cliente-anexos')
  WITH CHECK (bucket_id = 'cliente-anexos');

-- Trigger for updated_at on concorrentes
CREATE TRIGGER update_cliente_concorrentes_updated_at
  BEFORE UPDATE ON public.cliente_concorrentes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
