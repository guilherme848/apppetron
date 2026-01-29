-- =============================================
-- CS ONBOARDING MEETING SYSTEM
-- =============================================

-- 1) Tabela de perguntas configuráveis (Admin)
CREATE TABLE public.cs_onboarding_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_key TEXT NOT NULL,
  block_title TEXT NOT NULL,
  question_text TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  impacts_quality BOOLEAN NOT NULL DEFAULT false,
  weight INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Tabela de reuniões de onboarding
CREATE TABLE public.cs_onboarding_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cs_owner_id UUID REFERENCES public.team_members(id),
  meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
  overall_quality_score INTEGER CHECK (overall_quality_score >= 0 AND overall_quality_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  general_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3) Tabela de respostas
CREATE TABLE public.cs_onboarding_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.cs_onboarding_meetings(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.cs_onboarding_questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, question_id)
);

-- 4) Tabela de arquivos anexados
CREATE TABLE public.cs_onboarding_meeting_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES public.cs_onboarding_meetings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.team_members(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cs_onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_onboarding_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cs_onboarding_meeting_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow all access to cs_onboarding_questions" ON public.cs_onboarding_questions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_onboarding_meetings" ON public.cs_onboarding_meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_onboarding_answers" ON public.cs_onboarding_answers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to cs_onboarding_meeting_files" ON public.cs_onboarding_meeting_files FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_cs_onboarding_meetings_client ON public.cs_onboarding_meetings(client_id);
CREATE INDEX idx_cs_onboarding_answers_meeting ON public.cs_onboarding_answers(meeting_id);
CREATE INDEX idx_cs_onboarding_questions_block ON public.cs_onboarding_questions(block_key, order_index);

-- Triggers for updated_at
CREATE TRIGGER update_cs_onboarding_questions_updated_at BEFORE UPDATE ON public.cs_onboarding_questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cs_onboarding_meetings_updated_at BEFORE UPDATE ON public.cs_onboarding_meetings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cs_onboarding_answers_updated_at BEFORE UPDATE ON public.cs_onboarding_answers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- SEED: Perguntas padrão organizadas por blocos
-- =============================================

-- Bloco A — Governança
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('A', 'Governança', 'Em 1 minuto, me fale da sua loja e do momento atual.', false, true, 2, 1),
('A', 'Governança', 'Qual é a sua posição na empresa?', true, true, 3, 2),
('A', 'Governança', 'É sempre com você que devemos manter contato? Quem decide e quem executa?', true, true, 4, 3),
('A', 'Governança', 'Quem aprova criativos e em quanto tempo?', true, true, 4, 4),
('A', 'Governança', 'Canal oficial de alinhamento e aprovação?', true, true, 3, 5),
('A', 'Governança', '[DECISÃO] Definir: Decisor / Aprovador / Responsável WhatsApp / SLA de aprovação', true, true, 5, 6);

-- Bloco B — Objetivo e Métricas
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('B', 'Objetivo e Métricas', 'Quais objetivos você quer atingir com esse projeto?', true, true, 5, 1),
('B', 'Objetivo e Métricas', 'Qual é a sua meta com os anúncios?', true, true, 4, 2),
('B', 'Objetivo e Métricas', 'Hoje, qual a maior origem dos clientes?', false, true, 2, 3),
('B', 'Objetivo e Métricas', 'Qual é o ticket médio do varejo?', true, true, 3, 4),
('B', 'Objetivo e Métricas', 'Horários reais de atendimento.', true, true, 3, 5),
('B', 'Objetivo e Métricas', '[DECISÃO] Definir: KPI principal / Meta / Baseline atual', true, true, 5, 6);

-- Bloco C — Oferta e Anúncios
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('C', 'Oferta e Anúncios', 'Produtos mais vendidos e de maior margem', true, true, 4, 1),
('C', 'Oferta e Anúncios', 'O que você quer anunciar?', true, true, 4, 2),
('C', 'Oferta e Anúncios', '3 categorias/produtos foco dos próximos 30 dias', true, true, 4, 3),
('C', 'Oferta e Anúncios', 'Itens proibidos para anúncio', true, true, 3, 4),
('C', 'Oferta e Anúncios', 'Preferência: preço ou orçamento no WhatsApp?', false, true, 2, 5),
('C', 'Oferta e Anúncios', '[DECISÃO] Definir: Oferta principal / Oferta secundária / Proibidos / Regra de comunicação', true, true, 5, 6);

-- Bloco D — Estoque e Disponibilidade
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('D', 'Estoque e Disponibilidade', 'Itens com ruptura frequente', false, true, 3, 1),
('D', 'Estoque e Disponibilidade', 'Quem avisa quando falta produto?', true, true, 3, 2),
('D', 'Estoque e Disponibilidade', 'Sustenta oferta por 7 dias?', true, true, 4, 3),
('D', 'Estoque e Disponibilidade', 'Pronta-entrega vs encomenda', false, true, 2, 4);

-- Bloco E — Entrega e Frete
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('E', 'Entrega e Frete', 'Como funcionam as entregas?', true, true, 3, 1),
('E', 'Entrega e Frete', 'Regra de frete', true, true, 3, 2),
('E', 'Entrega e Frete', 'Frete grátis: quando e para onde?', false, true, 2, 3),
('E', 'Entrega e Frete', 'Entrega no mesmo dia: é possível?', false, true, 2, 4),
('E', 'Entrega e Frete', 'Quem calcula e responde sobre frete?', true, true, 3, 5),
('E', 'Entrega e Frete', '[DECISÃO] Definir: Regra objetiva de entrega/frete', true, true, 4, 6);

-- Bloco F — WhatsApp e Vendas
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('F', 'WhatsApp e Vendas', 'Quem atende e quantas pessoas na equipe?', true, true, 3, 1),
('F', 'WhatsApp e Vendas', 'Tempo médio de resposta atual e meta', true, true, 4, 2),
('F', 'WhatsApp e Vendas', 'Fluxo real de venda: como funciona?', true, true, 3, 3),
('F', 'WhatsApp e Vendas', 'Uso do WhatsApp Business: catálogo, etiquetas, mensagens automáticas?', false, true, 2, 4),
('F', 'WhatsApp e Vendas', 'Follow-up: quem faz, quando e quantas tentativas?', true, true, 4, 5),
('F', 'WhatsApp e Vendas', '[DECISÃO] Definir: Padrão mínimo de atendimento', true, true, 5, 6);

-- Bloco G — Diferenciais e Concorrência
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('G', 'Diferenciais e Concorrência', 'Principais diferenciais da empresa', true, true, 4, 1),
('G', 'Diferenciais e Concorrência', 'O que não pode faltar na comunicação?', true, true, 3, 2),
('G', 'Diferenciais e Concorrência', 'Principais concorrentes', false, true, 2, 3),
('G', 'Diferenciais e Concorrência', 'Pontos fortes e fracos dos concorrentes', false, true, 2, 4),
('G', 'Diferenciais e Concorrência', 'Perfil do cliente ideal', true, true, 4, 5),
('G', 'Diferenciais e Concorrência', '[DECISÃO] Definir: Frase de posicionamento / Ângulos de campanha', true, true, 5, 6);

-- Bloco H — Mídia, Verba e Acessos
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('H', 'Mídia, Verba e Acessos', 'Histórico em anúncios: já anunciou antes?', false, true, 2, 1),
('H', 'Mídia, Verba e Acessos', 'Investimento mensal e forma de pagamento', true, true, 4, 2),
('H', 'Mídia, Verba e Acessos', 'Região de anúncio', true, true, 3, 3),
('H', 'Mídia, Verba e Acessos', 'Datas especiais importantes', false, true, 2, 4),
('H', 'Mídia, Verba e Acessos', 'Redes sociais ativas', true, true, 3, 5),
('H', 'Mídia, Verba e Acessos', 'Acessos: BM, conta de anúncios, página, Instagram, WhatsApp', true, true, 4, 6),
('H', 'Mídia, Verba e Acessos', '[DECISÃO] Definir: Verba + Praça + Acessos com prazo', true, true, 5, 7);

-- Bloco I — Administrativo e Cronograma
INSERT INTO public.cs_onboarding_questions (block_key, block_title, question_text, is_required, impacts_quality, weight, order_index) VALUES
('I', 'Administrativo e Cronograma', 'Contrato assinado?', true, true, 3, 1),
('I', 'Administrativo e Cronograma', 'E-mail para relatórios', true, false, 1, 2),
('I', 'Administrativo e Cronograma', 'Onde enviar materiais (drive, etc)?', false, false, 1, 3),
('I', 'Administrativo e Cronograma', 'Prazo para campanhas no ar', true, true, 4, 4),
('I', 'Administrativo e Cronograma', 'SLA Petron e canais de suporte', true, false, 2, 5);