
-- Table: inteligencia_cliente
CREATE TABLE public.inteligencia_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  icp_descricao text,
  icp_perfil_comprador text,
  icp_comportamento text,
  icp_ticket_medio text,
  icp_observacoes text,
  produtos_especialidades text[],
  produtos_marcas text,
  produtos_carro_chefe text,
  produtos_mix_resumo text,
  produtos_observacoes text,
  diferencial text,
  tom_de_voz text,
  o_que_funciona text,
  o_que_nao_funciona text,
  referencias_visuais text,
  posicionamento text,
  observacoes_gerais text,
  preenchido_por uuid REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cliente_unico UNIQUE (cliente_id)
);

ALTER TABLE public.inteligencia_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read inteligencia_cliente"
  ON public.inteligencia_cliente FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert inteligencia_cliente"
  ON public.inteligencia_cliente FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update inteligencia_cliente"
  ON public.inteligencia_cliente FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Table: arquivos_inteligencia_cliente
CREATE TABLE public.arquivos_inteligencia_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  titulo text NOT NULL,
  categoria text NOT NULL,
  descricao text,
  arquivo_url text NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_tipo text,
  arquivo_tamanho bigint,
  enviado_por uuid REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.arquivos_inteligencia_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read arquivos_inteligencia"
  ON public.arquivos_inteligencia_cliente FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert arquivos_inteligencia"
  ON public.arquivos_inteligencia_cliente FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can delete arquivos_inteligencia"
  ON public.arquivos_inteligencia_cliente FOR DELETE TO authenticated USING (true);

-- Table: historico_acoes_comerciais
CREATE TABLE public.historico_acoes_comerciais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE NOT NULL,
  produto text NOT NULL,
  tipo_acao text,
  descricao text,
  periodo text,
  performou_bem boolean,
  observacao text,
  registrado_por uuid REFERENCES public.team_members(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.historico_acoes_comerciais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read historico_acoes"
  ON public.historico_acoes_comerciais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert historico_acoes"
  ON public.historico_acoes_comerciais FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update historico_acoes"
  ON public.historico_acoes_comerciais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete historico_acoes"
  ON public.historico_acoes_comerciais FOR DELETE TO authenticated USING (true);

-- Table: historico_sugestoes_ia
CREATE TABLE public.historico_sugestoes_ia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.accounts(id),
  solicitado_por uuid REFERENCES public.team_members(id),
  mes_referencia text,
  quantidade_solicitada integer,
  quantidade_aceita integer,
  formatos_solicitados jsonb,
  contexto_enviado text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.historico_sugestoes_ia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read historico_sugestoes_ia"
  ON public.historico_sugestoes_ia FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert historico_sugestoes_ia"
  ON public.historico_sugestoes_ia FOR INSERT TO authenticated WITH CHECK (true);

-- New columns on content_posts
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS sugerido_por_ia boolean DEFAULT false;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS legenda_sugerida text;
ALTER TABLE public.content_posts ADD COLUMN IF NOT EXISTS briefing_sugerido text;
