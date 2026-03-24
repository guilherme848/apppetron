
-- Tabela de categorias do Petron OS
CREATE TABLE public.petron_os_categorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  icone text,
  cor text,
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.petron_os_categorias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem categorias" ON public.petron_os_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins editam categorias" ON public.petron_os_categorias FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Tabela de ferramentas do Petron OS
CREATE TABLE public.petron_os_ferramentas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria_id uuid REFERENCES public.petron_os_categorias(id) ON DELETE CASCADE,
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  descricao text,
  icone text,
  cor text,
  tipo text NOT NULL DEFAULT 'rapida',
  campos_formulario jsonb,
  perguntas_guiadas jsonb,
  estrutura_documento jsonb,
  system_prompt text NOT NULL DEFAULT '',
  modelo_ia text DEFAULT 'google/gemini-2.5-flash',
  max_tokens integer DEFAULT 2000,
  ativo boolean DEFAULT true,
  ordem integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.petron_os_ferramentas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem ferramentas" ON public.petron_os_ferramentas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins editam ferramentas" ON public.petron_os_ferramentas FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Tabela de gerações do Petron OS
CREATE TABLE public.petron_os_geracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferramenta_id uuid REFERENCES public.petron_os_ferramentas(id) ON DELETE SET NULL,
  cliente_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  usuario_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  inputs jsonb,
  resultado text,
  historico_chat jsonb,
  conteudo_documento text,
  status text DEFAULT 'gerado',
  titulo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.petron_os_geracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todos veem geracoes" ON public.petron_os_geracoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Todos criam geracoes" ON public.petron_os_geracoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Criador edita geracoes" ON public.petron_os_geracoes FOR UPDATE TO authenticated USING (
  usuario_id = public.get_current_member_id() OR public.is_admin(auth.uid())
);

-- Seed: Categorias
INSERT INTO public.petron_os_categorias (nome, slug, icone, cor, ordem) VALUES
  ('Redes Sociais', 'redes_sociais', 'Share2', '--success', 1),
  ('Copy', 'copy', 'PenTool', '--accent-primary', 2),
  ('Documentos Estratégicos', 'documentos_estrategicos', 'FileText', '--info', 3);

-- Seed: Ferramentas
INSERT INTO public.petron_os_ferramentas (categoria_id, nome, slug, descricao, icone, cor, tipo, campos_formulario, system_prompt, max_tokens, ordem)
SELECT c.id, f.nome, f.slug, f.descricao, f.icone, f.cor, f.tipo, f.campos::jsonb, f.prompt, f.tokens, f.ordem
FROM public.petron_os_categorias c
CROSS JOIN (VALUES
  -- Redes Sociais
  ('redes_sociais', 'Legendas de Posts', 'legendas_posts', 'Crie legendas envolventes para posts de redes sociais', 'Type', '--success', 'rapida',
   '[{"nome":"assunto","label":"Assunto","tipo":"textarea","placeholder":"Sobre o que é o conteúdo?","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Persuasivo","Informativo","Descontraído","Profissional","Inspirador"],"obrigatorio":true},{"nome":"quantidade","label":"Quantos textos deseja gerar?","tipo":"number","min":1,"max":10,"padrao":3,"obrigatorio":true}]',
   E'Você é um especialista em social media. Crie legendas para posts de redes sociais.\n\n{{contexto_cliente}}\n\nREGRAS:\n- Tom de voz: {{tom_de_voz}}\n- Assunto: {{assunto}}\n- Gerar {{quantidade}} legendas diferentes\n- Cada legenda deve ter: gancho inicial forte, corpo, chamada para ação\n- Adaptar ao segmento e público do cliente\n- Se não houver contexto do cliente, criar legendas genéricas mas profissionais\n\nResponda com as legendas numeradas, separadas por ---',
   2000, 1),
  ('redes_sociais', 'Bio de Instagram', 'bio_instagram', 'Crie opções de bio para perfil do Instagram', 'AtSign', '--success', 'rapida',
   '[{"nome":"informacoes_chave","label":"Informações-chave","tipo":"textarea","placeholder":"Pontos principais que a bio deve comunicar","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Direto e popular","Técnico e premium","Próximo e familiar","Jovem e descontraído","Sério e profissional"],"obrigatorio":true}]',
   E'Você é um especialista em branding para redes sociais. Crie opções de bio para Instagram.\n\n{{contexto_cliente}}\n\nREGRAS:\n- Informações-chave: {{informacoes_chave}}\n- Tom de voz: {{tom_de_voz}}\n- Máximo 150 caracteres por bio\n- Incluir proposta de valor clara\n- Usar emojis estrategicamente\n- Gerar 3 opções\n\nResponda com as opções numeradas.',
   1500, 2),
  ('redes_sociais', 'Cronograma de Redes Sociais', 'cronograma_redes', 'Monte um cronograma completo de publicações', 'Calendar', '--success', 'rapida',
   '[{"nome":"periodo","label":"Período","tipo":"text","placeholder":"Ex: Março 2026, Próximas 2 semanas","obrigatorio":true},{"nome":"quantidade_posts","label":"Quantidade de posts","tipo":"number","min":1,"max":60,"padrao":12,"obrigatorio":true},{"nome":"plataformas","label":"Plataformas","tipo":"chips","opcoes":["Instagram","Facebook","LinkedIn","TikTok","YouTube"],"obrigatorio":true},{"nome":"objetivos","label":"Objetivos","tipo":"chips","opcoes":["Engajamento","Vendas","Educação","Branding","Tráfego"],"obrigatorio":true}]',
   E'Você é um estrategista de conteúdo para redes sociais. Monte um cronograma de publicações.\n\n{{contexto_cliente}}\n\nREGRAS:\n- Período: {{periodo}}\n- Quantidade de posts: {{quantidade_posts}}\n- Plataformas: {{plataformas}}\n- Objetivos: {{objetivos}}\n- Para cada post sugerir: data, tema, formato, breve descrição\n- Alternar tipos de conteúdo (educativo, venda, engajamento, institucional)\n\nResponda em formato de tabela organizada por data.',
   3000, 3),
  ('redes_sociais', 'Ideias de Stories', 'ideias_stories', 'Sugira ideias criativas de stories', 'Film', '--success', 'rapida',
   '[{"nome":"tema","label":"Tema","tipo":"textarea","placeholder":"Sobre o que devem ser os stories?","obrigatorio":true,"sugestao_ia":true},{"nome":"quantidade","label":"Quantidade","tipo":"number","min":1,"max":20,"padrao":5,"obrigatorio":true},{"nome":"objetivo","label":"Objetivo","tipo":"select","opcoes":["Engajamento","Vendas","Educação","Bastidores","Depoimentos"],"obrigatorio":true}]',
   E'Você é um criador de conteúdo especialista em Stories. Sugira ideias de stories.\n\n{{contexto_cliente}}\n\nREGRAS:\n- Tema: {{tema}}\n- Quantidade: {{quantidade}}\n- Objetivo: {{objetivo}}\n- Para cada story: descrição do conteúdo, tipo (enquete, quiz, bastidores, produto, depoimento), texto sugerido\n- Pensar em sequência narrativa\n\nResponda com as ideias numeradas.',
   2000, 4),
  -- Copy
  ('copy', 'Framework AIDA', 'framework_aida', 'Crie textos usando Atenção, Interesse, Desejo e Ação', 'Layers', '--accent-primary', 'rapida',
   '[{"nome":"assunto","label":"Assunto/Produto","tipo":"textarea","placeholder":"Descreva o produto ou assunto","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Persuasivo","Informativo","Descontraído","Profissional","Inspirador"],"obrigatorio":true},{"nome":"instrucoes_adicionais","label":"Instruções adicionais","tipo":"textarea","placeholder":"Alguma instrução específica?","obrigatorio":false},{"nome":"quantidade","label":"Quantidade","tipo":"number","min":1,"max":5,"padrao":2,"obrigatorio":true}]',
   E'Você é um copywriter especialista no framework AIDA (Atenção, Interesse, Desejo, Ação).\n\n{{contexto_cliente}}\n\nREGRAS:\n- Assunto/Produto: {{assunto}}\n- Tom de voz: {{tom_de_voz}}\n- Instruções adicionais: {{instrucoes_adicionais}}\n- Gerar {{quantidade}} versões\n- Cada versão deve ter as 4 seções: A, I, D, A\n\nResponda com as versões numeradas.',
   2500, 1),
  ('copy', 'Framework PAS', 'framework_pas', 'Crie textos usando Problema, Agitação e Solução', 'AlertTriangle', '--accent-primary', 'rapida',
   '[{"nome":"assunto","label":"Assunto/Produto","tipo":"textarea","placeholder":"Descreva o produto ou assunto","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Persuasivo","Informativo","Descontraído","Profissional","Inspirador"],"obrigatorio":true},{"nome":"instrucoes_adicionais","label":"Instruções adicionais","tipo":"textarea","placeholder":"Alguma instrução específica?","obrigatorio":false},{"nome":"quantidade","label":"Quantidade","tipo":"number","min":1,"max":5,"padrao":2,"obrigatorio":true}]',
   E'Você é um copywriter especialista no framework PAS (Problema, Agitação, Solução).\n\n{{contexto_cliente}}\n\nREGRAS:\n- Assunto/Produto: {{assunto}}\n- Tom de voz: {{tom_de_voz}}\n- Instruções adicionais: {{instrucoes_adicionais}}\n- Gerar {{quantidade}} versões\n- Cada versão: Problema, Agitação, Solução\n\nResponda com as versões numeradas.',
   2500, 2),
  ('copy', 'Framework BAB', 'framework_bab', 'Crie textos usando Before, After e Bridge', 'ArrowRightLeft', '--accent-primary', 'rapida',
   '[{"nome":"assunto","label":"Assunto/Produto","tipo":"textarea","placeholder":"Descreva o produto ou assunto","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Persuasivo","Informativo","Descontraído","Profissional","Inspirador"],"obrigatorio":true},{"nome":"instrucoes_adicionais","label":"Instruções adicionais","tipo":"textarea","placeholder":"Alguma instrução específica?","obrigatorio":false},{"nome":"quantidade","label":"Quantidade","tipo":"number","min":1,"max":5,"padrao":2,"obrigatorio":true}]',
   E'Você é um copywriter especialista no framework BAB (Before, After, Bridge).\n\n{{contexto_cliente}}\n\nREGRAS:\n- Assunto/Produto: {{assunto}}\n- Tom de voz: {{tom_de_voz}}\n- Instruções adicionais: {{instrucoes_adicionais}}\n- Gerar {{quantidade}} versões\n- Cada versão: Antes, Depois, Ponte\n\nResponda com as versões numeradas.',
   2500, 3),
  ('copy', 'Texto Persuasivo Livre', 'texto_persuasivo', 'Crie textos persuasivos com total liberdade', 'Pencil', '--accent-primary', 'rapida',
   '[{"nome":"objetivo","label":"Objetivo","tipo":"text","placeholder":"Ex: vender produto X, captar leads","obrigatorio":true},{"nome":"publico","label":"Público","tipo":"text","placeholder":"Para quem é esse texto?","obrigatorio":true,"sugestao_ia":true},{"nome":"tom_de_voz","label":"Tom de voz","tipo":"select","opcoes":["Persuasivo","Informativo","Descontraído","Profissional","Inspirador"],"obrigatorio":true},{"nome":"instrucoes","label":"Instruções","tipo":"textarea","placeholder":"Descreva o que deseja","obrigatorio":true},{"nome":"tamanho","label":"Tamanho","tipo":"select","opcoes":["Curto (até 100 palavras)","Médio (100-300 palavras)","Longo (300+ palavras)"],"obrigatorio":true}]',
   E'Você é um copywriter versátil. Crie texto persuasivo conforme as instruções.\n\n{{contexto_cliente}}\n\nREGRAS:\n- Objetivo: {{objetivo}}\n- Público: {{publico}}\n- Tom de voz: {{tom_de_voz}}\n- Instruções: {{instrucoes}}\n- Tamanho: {{tamanho}}\n\nResponda com o texto pronto.',
   3000, 4),
  -- Documentos Estratégicos
  ('documentos_estrategicos', 'ICP — Cliente Ideal', 'icp_cliente_ideal', 'Construa o perfil do cliente ideal com a IA', 'Users', '--info', 'construtor',
   NULL,
   E'Você é um consultor estratégico de marketing. Seu papel é ajudar a construir o perfil do ICP (Cliente Ideal) de uma empresa através de um processo de entrevista guiada.\n\nSe houver contexto do cliente disponível, use-o para enriquecer suas perguntas e antecipar informações.\n\nFaça perguntas uma por vez, aguarde a resposta, e vá construindo o documento.\n\n{{contexto_cliente}}\n\nResponda SEMPRE em JSON: {"mensagem_chat":"string","atualizacao_documento":{"secao":"string","conteudo":"string HTML"},"concluido":boolean}',
   4000, 1),
  ('documentos_estrategicos', 'Planejamento de Marketing', 'planejamento_marketing', 'Monte um plano de marketing completo', 'Target', '--info', 'construtor',
   NULL,
   E'Você é um estrategista de marketing digital. Seu papel é ajudar a criar um planejamento de marketing completo através de uma conversa guiada.\n\nSe houver contexto do cliente disponível, use-o para enriquecer suas perguntas.\n\n{{contexto_cliente}}\n\nResponda SEMPRE em JSON: {"mensagem_chat":"string","atualizacao_documento":{"secao":"string","conteudo":"string HTML"},"concluido":boolean}',
   4000, 2),
  ('documentos_estrategicos', 'Análise de Concorrência', 'analise_concorrencia', 'Analise a concorrência de forma estruturada', 'Eye', '--info', 'construtor',
   NULL,
   E'Você é um analista de mercado. Seu papel é ajudar a construir uma análise competitiva detalhada através de perguntas guiadas.\n\nSe houver contexto do cliente disponível, use-o.\n\n{{contexto_cliente}}\n\nResponda SEMPRE em JSON: {"mensagem_chat":"string","atualizacao_documento":{"secao":"string","conteudo":"string HTML"},"concluido":boolean}',
   4000, 3),
  ('documentos_estrategicos', 'Briefing de Posicionamento', 'briefing_posicionamento', 'Defina o posicionamento de marca', 'Award', '--info', 'construtor',
   NULL,
   E'Você é um especialista em branding e posicionamento. Seu papel é ajudar a definir o posicionamento de marca através de perguntas estratégicas.\n\nSe houver contexto do cliente disponível, use-o.\n\n{{contexto_cliente}}\n\nResponda SEMPRE em JSON: {"mensagem_chat":"string","atualizacao_documento":{"secao":"string","conteudo":"string HTML"},"concluido":boolean}',
   4000, 4)
) AS f(cat_slug, nome, slug, descricao, icone, cor, tipo, campos, prompt, tokens, ordem)
WHERE c.slug = f.cat_slug;

-- Add perguntas_guiadas and estrutura_documento for construtores
UPDATE public.petron_os_ferramentas SET 
  perguntas_guiadas = '[{"pergunta":"Qual o segmento da empresa e qual o público principal?","secao":"perfil"},{"pergunta":"Como os clientes chegam até a empresa hoje? (indicação, busca online, redes sociais)","secao":"comportamento"},{"pergunta":"Qual o ticket médio e frequência de compra?","secao":"financeiro"},{"pergunta":"Quais as principais dores ou necessidades do cliente ideal?","secao":"dores"},{"pergunta":"O que o cliente ideal mais valoriza na hora de escolher (preço, qualidade, atendimento)?","secao":"decisao"}]'::jsonb,
  estrutura_documento = '[{"slug":"perfil","titulo":"Perfil do Cliente Ideal"},{"slug":"comportamento","titulo":"Comportamento de Compra"},{"slug":"financeiro","titulo":"Dados Financeiros"},{"slug":"dores","titulo":"Dores e Necessidades"},{"slug":"decisao","titulo":"Fatores de Decisão"},{"slug":"resumo","titulo":"Resumo Executivo"}]'::jsonb
WHERE slug = 'icp_cliente_ideal';

UPDATE public.petron_os_ferramentas SET 
  perguntas_guiadas = '[{"pergunta":"Quais os principais objetivos de marketing para os próximos meses?","secao":"objetivos"},{"pergunta":"Quais canais de marketing a empresa já utiliza? O que funciona melhor?","secao":"canais"},{"pergunta":"Qual o orçamento disponível para marketing?","secao":"orcamento"},{"pergunta":"Quem são os principais concorrentes e como se posicionam?","secao":"concorrencia"},{"pergunta":"Quais resultados você espera alcançar (leads, vendas, awareness)?","secao":"metas"}]'::jsonb,
  estrutura_documento = '[{"slug":"objetivos","titulo":"Objetivos Estratégicos"},{"slug":"canais","titulo":"Canais e Táticas"},{"slug":"orcamento","titulo":"Orçamento e Investimento"},{"slug":"concorrencia","titulo":"Análise Competitiva"},{"slug":"metas","titulo":"Metas e KPIs"},{"slug":"plano_acao","titulo":"Plano de Ação"}]'::jsonb
WHERE slug = 'planejamento_marketing';

UPDATE public.petron_os_ferramentas SET 
  perguntas_guiadas = '[{"pergunta":"Quais são os principais concorrentes diretos da empresa?","secao":"concorrentes"},{"pergunta":"Quais os pontos fortes dos concorrentes que você admira?","secao":"pontos_fortes"},{"pergunta":"Onde você acredita que os concorrentes são fracos?","secao":"pontos_fracos"},{"pergunta":"Como os concorrentes se posicionam nas redes sociais e marketing?","secao":"marketing"},{"pergunta":"Qual o diferencial competitivo da sua empresa frente a eles?","secao":"diferencial"}]'::jsonb,
  estrutura_documento = '[{"slug":"concorrentes","titulo":"Concorrentes Mapeados"},{"slug":"pontos_fortes","titulo":"Pontos Fortes"},{"slug":"pontos_fracos","titulo":"Oportunidades"},{"slug":"marketing","titulo":"Presença Digital"},{"slug":"diferencial","titulo":"Diferencial Competitivo"},{"slug":"recomendacoes","titulo":"Recomendações"}]'::jsonb
WHERE slug = 'analise_concorrencia';

UPDATE public.petron_os_ferramentas SET 
  perguntas_guiadas = '[{"pergunta":"Como a empresa quer ser percebida pelo público?","secao":"percepcao"},{"pergunta":"Quais os valores e princípios fundamentais da marca?","secao":"valores"},{"pergunta":"Qual o tom de voz e personalidade da comunicação?","secao":"tom_voz"},{"pergunta":"Quem é o público que a marca quer atrair?","secao":"publico"},{"pergunta":"O que diferencia a marca de todas as outras no mercado?","secao":"diferencial"}]'::jsonb,
  estrutura_documento = '[{"slug":"percepcao","titulo":"Posicionamento Desejado"},{"slug":"valores","titulo":"Valores e Propósito"},{"slug":"tom_voz","titulo":"Tom de Voz e Personalidade"},{"slug":"publico","titulo":"Público-Alvo"},{"slug":"diferencial","titulo":"Diferencial de Marca"},{"slug":"diretrizes","titulo":"Diretrizes de Comunicação"}]'::jsonb
WHERE slug = 'briefing_posicionamento';
