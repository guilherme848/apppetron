
-- Activity feed table
CREATE TABLE public.atividade_sistema (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL,
  descricao text NOT NULL,
  usuario_id uuid REFERENCES public.team_members(id),
  cliente_id uuid REFERENCES public.accounts(id),
  referencia_id uuid,
  referencia_tipo text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_atividade_created ON public.atividade_sistema(created_at DESC);

ALTER TABLE public.atividade_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem atividades" ON public.atividade_sistema FOR SELECT USING (true);
CREATE POLICY "Sistema insere atividades" ON public.atividade_sistema FOR INSERT WITH CHECK (true);

-- Weekly highlights cache
CREATE TABLE public.destaques_semanais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  semana_referencia date NOT NULL,
  usuario_id uuid REFERENCES public.team_members(id),
  cargo text,
  metrica text,
  valor numeric,
  descricao text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.destaques_semanais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem destaques" ON public.destaques_semanais FOR SELECT USING (true);
CREATE POLICY "Sistema insere destaques" ON public.destaques_semanais FOR INSERT WITH CHECK (true);

-- Trigger: log activity when a content post is completed
CREATE OR REPLACE FUNCTION public.registrar_atividade_post_concluido()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.status = 'done')
     AND (OLD.status IS DISTINCT FROM NEW.status)
     AND (NEW.data_conclusao IS NOT NULL) THEN
    INSERT INTO public.atividade_sistema (tipo, descricao, usuario_id, cliente_id, referencia_id, referencia_tipo)
    SELECT 
      'post_concluido',
      'concluiu o post "' || NEW.title || '"',
      NEW.assignee_id,
      cb.client_id,
      NEW.id,
      'conteudo'
    FROM public.content_batches cb WHERE cb.id = NEW.batch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_atividade_post_concluido
AFTER UPDATE ON public.content_posts
FOR EACH ROW
EXECUTE FUNCTION public.registrar_atividade_post_concluido();

-- Trigger: log activity when a new account is created
CREATE OR REPLACE FUNCTION public.registrar_atividade_cliente_cadastrado()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.atividade_sistema (tipo, descricao, cliente_id, referencia_id, referencia_tipo)
  VALUES (
    'cliente_cadastrado',
    'cadastrou o cliente "' || NEW.name || '"',
    NEW.id,
    NEW.id,
    'cliente'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_atividade_cliente_cadastrado
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION public.registrar_atividade_cliente_cadastrado();
