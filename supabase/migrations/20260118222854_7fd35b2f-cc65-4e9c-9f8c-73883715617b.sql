-- Tabela de conteúdos
CREATE TABLE public.content_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  channel TEXT,
  format TEXT,
  status TEXT NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'briefing', 'producing', 'review', 'approved', 'scheduled', 'published')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  owner TEXT,
  due_date DATE,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  brief TEXT,
  copy_text TEXT,
  creative_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de revisões
CREATE TABLE public.content_revisions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID NOT NULL REFERENCES public.content_items(id) ON DELETE CASCADE,
  notes TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

-- Políticas públicas (app interno sem login)
CREATE POLICY "Allow all access to content_items" ON public.content_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to content_revisions" ON public.content_revisions FOR ALL USING (true) WITH CHECK (true);

-- Índices
CREATE INDEX idx_content_items_client_id ON public.content_items(client_id);
CREATE INDEX idx_content_items_status ON public.content_items(status);
CREATE INDEX idx_content_items_scheduled_at ON public.content_items(scheduled_at);
CREATE INDEX idx_content_items_due_date ON public.content_items(due_date);
CREATE INDEX idx_content_revisions_content_id ON public.content_revisions(content_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_content_items_updated_at
  BEFORE UPDATE ON public.content_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();