-- ═══════════════════════════════════════════════════════════════════════════
-- MÓDULO RH: Unificação do fluxo (Função = Vaga)
--
-- 1. Adiciona accepting_applications em hr_job_profiles (toggle processo seletivo)
-- 2. Adiciona salary_range, start_requirement, tools_expected em profiles
-- 3. Cria RPC hr_get_public_profiles() — lista todas as funções abertas (anon)
-- 4. Cria RPC hr_submit_unified_application() — submit único a partir de profile
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Colunas novas em hr_job_profiles ──────────────────────────────────────

ALTER TABLE public.hr_job_profiles
  ADD COLUMN IF NOT EXISTS accepting_applications BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_range TEXT,                     -- ex: "R$2.000 - R$3.500"
  ADD COLUMN IF NOT EXISTS requires_experience BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS short_pitch TEXT;                      -- descrição curta pra listagem pública

-- Index pra queries públicas
CREATE INDEX IF NOT EXISTS idx_hr_job_profiles_accepting
  ON public.hr_job_profiles(accepting_applications)
  WHERE accepting_applications = true;

-- ─── Policy anon pra listar profiles abertos ──────────────────────────────

DROP POLICY IF EXISTS "anon_read_accepting_profiles" ON public.hr_job_profiles;
CREATE POLICY "anon_read_accepting_profiles"
ON public.hr_job_profiles FOR SELECT
TO anon
USING (accepting_applications = true AND status = 'active');

-- ─── RPC: listar profiles abertos pra página pública ─────────────────────

CREATE OR REPLACE FUNCTION public.hr_get_public_profiles()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'title_public', title_public,
      'department', department,
      'seniority', seniority,
      'contract_type', contract_type,
      'modality', modality,
      'base_city', base_city,
      'mission', mission,
      'short_pitch', short_pitch,
      'deliverables', deliverables,
      'skills', skills,
      'tools', tools,
      'requirements', requirements,
      'salary_range', salary_range,
      'requires_experience', requires_experience
    )
    ORDER BY title_public
  )
  INTO result
  FROM public.hr_job_profiles
  WHERE accepting_applications = true AND status = 'active';

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_get_public_profiles() TO anon;
GRANT EXECUTE ON FUNCTION public.hr_get_public_profiles() TO authenticated;

-- ─── RPC: submit unificado (profile_id → cria job+stages+application sob demanda) ─

CREATE OR REPLACE FUNCTION public.hr_submit_unified_application(
  p_profile_id UUID,
  p_candidate JSONB,     -- { full_name, email, phone, city, state, linkedin_url, portfolio_url }
  p_responses JSONB,     -- [{ field_key, label, value }, ...] - todas as respostas do form global
  p_resume_url TEXT DEFAULT NULL,
  p_resume_filename TEXT DEFAULT NULL,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile RECORD;
  v_job_id UUID;
  v_candidate_id UUID;
  v_application_id UUID;
  v_stage_id UUID;
  v_stage JSONB;
  v_response JSONB;
  v_slug TEXT;
BEGIN
  -- Anti-spam
  IF p_honeypot IS NOT NULL AND p_honeypot <> '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'spam_detected');
  END IF;

  -- Buscar profile aberto
  SELECT * INTO v_profile
  FROM public.hr_job_profiles
  WHERE id = p_profile_id
    AND accepting_applications = true
    AND status = 'active'
  LIMIT 1;

  IF v_profile IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Vaga não encontrada ou não está mais recebendo inscrições'
    );
  END IF;

  -- Validar campos mínimos do candidato
  IF (p_candidate->>'email') IS NULL OR length(p_candidate->>'email') < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Email é obrigatório');
  END IF;
  IF (p_candidate->>'full_name') IS NULL OR length(p_candidate->>'full_name') < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nome completo é obrigatório');
  END IF;

  -- Garantir que existe um hr_jobs associado ao profile (criar sob demanda)
  SELECT id INTO v_job_id
  FROM public.hr_jobs
  WHERE job_profile_id = p_profile_id
    AND status IN ('open', 'draft')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_job_id IS NULL THEN
    -- Criar job novo a partir do profile
    v_slug := public.hr_slugify(v_profile.title_public);
    WHILE EXISTS (SELECT 1 FROM public.hr_jobs WHERE slug = v_slug) LOOP
      v_slug := v_slug || '-' || substr(gen_random_uuid()::text, 1, 4);
    END LOOP;

    INSERT INTO public.hr_jobs (
      job_profile_id, title, slug, description, snapshot_profile,
      manager_member_id, status, opened_at
    ) VALUES (
      p_profile_id,
      v_profile.title_public,
      v_slug,
      v_profile.mission,
      to_jsonb(v_profile),
      v_profile.manager_member_id,
      'open',
      now()
    )
    RETURNING id INTO v_job_id;

    -- Copiar default_stages do profile
    FOR v_stage IN SELECT * FROM jsonb_array_elements(v_profile.default_stages)
    LOOP
      INSERT INTO public.hr_pipeline_stages (
        job_id, name, order_index, color, is_terminal_success, is_terminal_rejection
      ) VALUES (
        v_job_id,
        v_stage->>'name',
        (v_stage->>'order')::INT,
        COALESCE(v_stage->>'color', '#94a3b8'),
        COALESCE((v_stage->>'is_terminal_success')::BOOLEAN, false),
        COALESCE((v_stage->>'is_terminal_rejection')::BOOLEAN, false)
      );
    END LOOP;
  END IF;

  -- Upsert candidato
  INSERT INTO public.hr_candidates (
    full_name, email, phone, birth_date, city, state, linkedin_url, portfolio_url, source
  ) VALUES (
    p_candidate->>'full_name',
    lower(p_candidate->>'email'),
    p_candidate->>'phone',
    NULLIF(p_candidate->>'birth_date', '')::DATE,
    p_candidate->>'city',
    p_candidate->>'state',
    p_candidate->>'linkedin_url',
    p_candidate->>'portfolio_url',
    'trabalhe-conosco'
  )
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, hr_candidates.phone),
    city = COALESCE(EXCLUDED.city, hr_candidates.city),
    state = COALESCE(EXCLUDED.state, hr_candidates.state),
    linkedin_url = COALESCE(EXCLUDED.linkedin_url, hr_candidates.linkedin_url),
    portfolio_url = COALESCE(EXCLUDED.portfolio_url, hr_candidates.portfolio_url),
    updated_at = now()
  RETURNING id INTO v_candidate_id;

  -- Anti-duplicata: mesma pessoa não pode aplicar 2x pra mesma vaga
  IF EXISTS (
    SELECT 1 FROM public.hr_applications
    WHERE candidate_id = v_candidate_id AND job_id = v_job_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Você já se inscreveu nesta vaga. Aguarde nosso retorno pelo WhatsApp.',
      'code', 'DUPLICATE'
    );
  END IF;

  -- Buscar primeira stage (análise de currículo)
  SELECT id INTO v_stage_id
  FROM public.hr_pipeline_stages
  WHERE job_id = v_job_id
  ORDER BY order_index ASC
  LIMIT 1;

  -- Criar application
  INSERT INTO public.hr_applications (
    candidate_id, job_id, form_id, current_stage_id, status,
    resume_url, resume_filename, applied_at
  ) VALUES (
    v_candidate_id,
    v_job_id,
    NULL,
    v_stage_id,
    'active',
    p_resume_url,
    p_resume_filename,
    now()
  )
  RETURNING id INTO v_application_id;

  -- Salvar respostas
  FOR v_response IN SELECT * FROM jsonb_array_elements(COALESCE(p_responses, '[]'::jsonb))
  LOOP
    INSERT INTO public.hr_form_responses (application_id, field_key, label, value)
    VALUES (
      v_application_id,
      v_response->>'field_key',
      v_response->>'label',
      v_response->'value'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'application_id', v_application_id,
    'candidate_id', v_candidate_id,
    'message', 'Inscrição enviada com sucesso! Entraremos em contato pelo WhatsApp em breve.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.hr_submit_unified_application(UUID, JSONB, JSONB, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.hr_submit_unified_application(UUID, JSONB, JSONB, TEXT, TEXT, TEXT) TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: 6 profiles iniciais da Petron
-- ═══════════════════════════════════════════════════════════════════════════

-- Idempotente por title_internal
DELETE FROM public.hr_job_profiles WHERE title_internal IN (
  'Atendimento / SDR',
  'Designer',
  'Gestor de Tráfego',
  'Social Media',
  'Sucesso do Cliente (CS)',
  'Videomaker'
);

-- 1. ATENDIMENTO / SDR
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Atendimento / SDR',
  'Pré-vendedor(a) de Atendimento',
  'Comercial',
  'junior',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['SDR', 'Pré-vendas', 'BDR', 'Prospector'],
  'Ser o primeiro ponto de contato com leads que chegam pelas campanhas de mídia paga e canais orgânicos da Petron, qualificando e agendando reuniões com os consultores comerciais. Esta função é a porta de entrada para quem quer começar carreira em vendas B2B em agência de marketing, com trilha clara de crescimento para Closer.',
  'Porta de entrada para vendas B2B. Agende reuniões qualificadas e cresça para Closer.',
  '[
    "Atender leads recebidos em até 5 minutos no horário comercial",
    "Qualificar leads com base no ICP (lojas MatCon > R$200k/mês)",
    "Agendar 30+ reuniões qualificadas por mês",
    "Cadastrar 100% dos leads com dados completos no CRM",
    "Executar cadência de follow-up estruturada (3 tentativas em 48h)"
  ]'::jsonb,
  '[
    {"name": "Comunicação verbal clara e consultiva", "level": "intermediate", "required": true},
    {"name": "Escrita profissional sem erros de português", "level": "intermediate", "required": true},
    {"name": "Organização e gestão de rotina", "level": "intermediate", "required": true},
    {"name": "Resiliência em alto volume de contatos", "level": "intermediate", "required": true},
    {"name": "Curiosidade sobre o mercado de construção civil", "level": "basic", "required": true}
  ]'::jsonb,
  '[
    {"name": "WhatsApp Business", "required": true},
    {"name": "Google Sheets", "required": true},
    {"name": "Google Meet", "required": true},
    {"name": "CRM (treinamento interno)", "required": false}
  ]'::jsonb,
  '[
    "Ensino médio completo",
    "Disponibilidade para trabalho presencial em Içara - SC",
    "Internet estável e smartphone próprio"
  ]'::jsonb,
  'Trilha: SDR → SDR Sr → Closer Jr → Closer. Comissão: R$10/reunião + R$150-500/venda. Aceita sem experiência.',
  true,
  false,
  'R$ 1.800 - R$ 2.500 + comissões'
);

-- 2. DESIGNER (exige experiência)
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Designer',
  'Designer Gráfico (Social Media)',
  'Operações',
  'pleno',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['Social Media Designer', 'Designer Gráfico', 'Graphic Designer'],
  'Criar criativos estáticos, identidade visual e adaptações para lojas de materiais de construção (MatCon), entregando peças que performam bem em redes sociais, geram reconhecimento de marca e contribuem para o crescimento dos clientes da Petron.',
  'Crie os criativos que são a cara das lojas de materiais de construção do Brasil.',
  '[
    "Entregar 25-35 criativos estáticos por mês por cliente",
    "Adaptar peças para múltiplos formatos (feed, stories, reels cover, anúncios)",
    "Criar templates e sistemas visuais escaláveis",
    "Seguir o Manual de Identidade Visual Petron e dos clientes",
    "Participar do planejamento mensal de conteúdo"
  ]'::jsonb,
  '[
    {"name": "Figma avançado (auto-layout, componentes, variáveis)", "level": "advanced", "required": true},
    {"name": "Adobe Photoshop (retoque, composição, máscaras)", "level": "advanced", "required": true},
    {"name": "Teoria da cor aplicada e tipografia", "level": "advanced", "required": true},
    {"name": "Composição e hierarquia visual", "level": "advanced", "required": true},
    {"name": "Branding e sistemas de identidade visual", "level": "intermediate", "required": true},
    {"name": "Adobe Illustrator", "level": "intermediate", "required": true}
  ]'::jsonb,
  '[
    {"name": "Figma", "required": true},
    {"name": "Adobe Photoshop", "required": true},
    {"name": "Adobe Illustrator", "required": true},
    {"name": "Canva", "required": true},
    {"name": "After Effects", "required": false}
  ]'::jsonb,
  '[
    "Experiência COMPROVADA mínima de 1 ano como Designer",
    "Portfólio diverso com peças para redes sociais",
    "Ensino superior cursando ou completo",
    "Disponibilidade para trabalho presencial em Içara - SC"
  ]'::jsonb,
  'EXIGE experiência real. Pedir portfólio obrigatório na triagem. Avaliar 3 peças recentes de redes sociais.',
  true,
  true,
  'R$ 2.500 - R$ 4.500'
);

-- 3. GESTOR DE TRÁFEGO
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Gestor de Tráfego',
  'Gestor(a) de Tráfego Pago',
  'Operações',
  'junior',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['Traffic Manager', 'Gestor de Mídia Paga', 'Media Buyer'],
  'Gerenciar campanhas de tráfego pago (Meta Ads e Google Ads) para lojas de materiais de construção, otimizando orçamento, criativos e audiências para gerar leads, vendas e retorno previsível.',
  'Gerencie campanhas Meta/Google para lojas de construção. Perfil analítico, aceita sem experiência.',
  '[
    "Gerenciar de 3 a 6 contas de clientes MatCon simultaneamente",
    "Planejar campanhas mensais alinhadas com metas comerciais",
    "Otimizar campanhas diariamente (pausar, escalar, ajustar orçamentos)",
    "Produzir relatórios semanais com análise qualitativa",
    "Manter ROAS dentro da meta definida"
  ]'::jsonb,
  '[
    {"name": "Raciocínio lógico e analítico", "level": "intermediate", "required": true},
    {"name": "Excel / Google Sheets intermediário", "level": "intermediate", "required": true},
    {"name": "Disciplina e organização", "level": "intermediate", "required": true},
    {"name": "Curiosidade sobre comportamento de consumidor", "level": "basic", "required": true},
    {"name": "Conhecimento de Meta Ads", "level": "basic", "required": false}
  ]'::jsonb,
  '[
    {"name": "Meta Business Manager / Ads Manager", "required": true},
    {"name": "Google Sheets", "required": true},
    {"name": "Google Ads", "required": false},
    {"name": "Google Analytics 4 (GA4)", "required": false},
    {"name": "Looker Studio", "required": false}
  ]'::jsonb,
  '[
    "Ensino superior cursando ou completo (Marketing, Publicidade, Administração)",
    "Disponibilidade para trabalho presencial em Içara - SC",
    "Internet estável",
    "Vontade real de construir carreira em Tráfego Pago"
  ]'::jsonb,
  'ENTRADA na área. Oferecemos onboarding técnico de 30 dias. Experiência prévia é diferencial.',
  true,
  false,
  'R$ 2.000 - R$ 3.500'
);

-- 4. SOCIAL MEDIA
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Social Media',
  'Social Media / Estrategista de Conteúdo',
  'Operações',
  'junior',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['Content Strategist', 'Analista de Conteúdo', 'Planner'],
  'Planejar e executar estratégias de conteúdo orgânico para redes sociais de lojas de materiais de construção. Traduzir o posicionamento de cada cliente em calendários editoriais, roteiros, legendas e interações.',
  'Para quem ama Instagram, TikTok e storytelling. Aceita sem experiência profissional.',
  '[
    "Criar calendário editorial mensal (3-5 posts/semana por cliente)",
    "Escrever legendas, títulos e roteiros de Reels",
    "Briefar Designer e Videomaker com referências claras",
    "Monitorar comentários e DMs em até 2h",
    "Sugerir pautas com base em tendências e sazonalidade"
  ]'::jsonb,
  '[
    {"name": "Copywriting para redes sociais", "level": "intermediate", "required": true},
    {"name": "Português impecável", "level": "advanced", "required": true},
    {"name": "Senso estético e visual", "level": "intermediate", "required": true},
    {"name": "Curiosidade por tendências de Instagram e TikTok", "level": "intermediate", "required": true},
    {"name": "Organização e cumprimento de prazos", "level": "intermediate", "required": true}
  ]'::jsonb,
  '[
    {"name": "Meta Business Suite", "required": true},
    {"name": "Instagram e TikTok", "required": true},
    {"name": "Canva", "required": true},
    {"name": "Google Sheets", "required": true},
    {"name": "mLabs, Etus ou Postgrain", "required": false}
  ]'::jsonb,
  '[
    "Ensino superior cursando ou completo (Publicidade, Jornalismo, Letras, Marketing)",
    "Perfil pessoal ativo em redes sociais",
    "Disponibilidade para trabalho presencial em Içara - SC"
  ]'::jsonb,
  'ENTRADA. Teste obrigatório: escrever legenda para um produto fictício com gancho, corpo e CTA.',
  true,
  false,
  'R$ 1.800 - R$ 3.200'
);

-- 5. SUCESSO DO CLIENTE (CS)
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Sucesso do Cliente (CS)',
  'Customer Success Manager',
  'Customer Success',
  'junior',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['CS', 'CSM', 'Customer Success Manager', 'Account Manager'],
  'Garantir que os clientes da Petron (lojas MatCon) obtenham o máximo de resultado possível dos serviços contratados, reduzindo churn, aumentando satisfação e identificando oportunidades de expansão.',
  'Seja o elo entre agência e cliente. Para quem gosta de resolver problemas e não foge de cliente difícil.',
  '[
    "Conduzir reuniões mensais estruturadas com clientes",
    "Garantir onboarding completo nos primeiros 30 dias",
    "Monitorar health score de cada conta",
    "Acionar plano de recuperação em sinais de churn",
    "Coletar NPS e manter média > 8"
  ]'::jsonb,
  '[
    {"name": "Comunicação empática e consultiva", "level": "advanced", "required": true},
    {"name": "Resolução de conflitos e negociação", "level": "intermediate", "required": true},
    {"name": "Proatividade e antecipação de problemas", "level": "intermediate", "required": true},
    {"name": "Análise básica de dados", "level": "intermediate", "required": true},
    {"name": "Organização e gestão de múltiplas contas", "level": "advanced", "required": true}
  ]'::jsonb,
  '[
    {"name": "Google Meet e WhatsApp Business", "required": true},
    {"name": "Google Sheets", "required": true},
    {"name": "CRM (ERP Petron)", "required": false},
    {"name": "Looker Studio", "required": false}
  ]'::jsonb,
  '[
    "Ensino superior cursando ou completo",
    "Perfil comunicativo, empático e organizado",
    "Disponibilidade para trabalho presencial em Içara - SC",
    "Carteira de habilitação é diferencial"
  ]'::jsonb,
  'ENTRADA. Excelente para quem vem de atendimento, comercial ou administração.',
  true,
  false,
  'R$ 2.200 - R$ 3.500'
);

-- 6. VIDEOMAKER (exige experiência)
INSERT INTO public.hr_job_profiles (
  title_internal, title_public, department, seniority, contract_type, modality,
  base_city, synonyms, mission, short_pitch, deliverables, skills, tools, requirements, notes,
  accepting_applications, requires_experience, salary_range
) VALUES (
  'Videomaker',
  'Videomaker / Editor de Reels',
  'Operações',
  'pleno',
  'clt',
  'presencial',
  'Içara - SC',
  ARRAY['Video Editor', 'Editor de Vídeo', 'Produtor de Conteúdo Audiovisual'],
  'Produzir vídeos curtos de alta performance (Reels, Stories, TikTok) para lojas de materiais de construção, desde a captação até a edição final.',
  'Produza Reels que param o scroll. Exige experiência comprovada com edição.',
  '[
    "Entregar 15-20 Reels editados por mês por cliente",
    "Captar vídeos em campo nas lojas quando necessário",
    "Editar com ritmo adequado a cada plataforma",
    "Aplicar trends, transições e efeitos coerentes com a marca",
    "Garantir qualidade de áudio e vídeo"
  ]'::jsonb,
  '[
    {"name": "Adobe Premiere Pro OU CapCut Pro", "level": "advanced", "required": true},
    {"name": "Captação com smartphone e câmera DSLR", "level": "advanced", "required": true},
    {"name": "Iluminação básica e composição de cena", "level": "intermediate", "required": true},
    {"name": "Ritmo e storytelling para Reels", "level": "advanced", "required": true},
    {"name": "Áudio e tratamento sonoro básico", "level": "intermediate", "required": true}
  ]'::jsonb,
  '[
    {"name": "Adobe Premiere Pro", "required": true},
    {"name": "CapCut Pro", "required": true},
    {"name": "Câmera própria (smartphone de boa qualidade mínimo)", "required": true},
    {"name": "After Effects", "required": false},
    {"name": "DaVinci Resolve", "required": false}
  ]'::jsonb,
  '[
    "Experiência COMPROVADA mínima de 1 ano como Videomaker/Editor",
    "Portfólio com Reels ou vídeos curtos",
    "Ensino médio completo",
    "Disponibilidade para trabalho presencial em Içara - SC e visitas a clientes",
    "Carteira de habilitação (visitas) é obrigatória"
  ]'::jsonb,
  'EXIGE experiência real. Pedir portfólio obrigatório. Avaliar 3 Reels recentes de ritmos diferentes.',
  true,
  true,
  'R$ 2.500 - R$ 4.500'
);

SELECT id, title_internal, accepting_applications, requires_experience, salary_range
FROM public.hr_job_profiles
WHERE accepting_applications = true
ORDER BY title_internal;
