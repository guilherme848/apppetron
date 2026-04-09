# MAPA COMPLETO — ERP PETRON

**Status:** 06 de Abril de 2026
**Autor:** Claude Code (auditoria + consolidacao)
**Destinatario:** Guilherme Rosso — Petron Marketing

---

## PARTE 1 — VISAO GERAL DO SISTEMA

### O que o sistema e

O ERP Petron e uma plataforma interna completa para gestao de uma agencia de marketing especializada em MatCon (Material de Construcao). Centraliza vendas, producao de conteudo, trafego pago, customer success, contratos e ferramentas de IA generativa em um unico sistema.

| Aspecto | Detalhe |
|---------|---------|
| **Stack** | React + Vite + TailwindCSS + shadcn/ui + Supabase + Vercel |
| **Banco de dados** | PostgreSQL (Supabase) — 161 tabelas |
| **Frontend** | ~430 arquivos React/TypeScript |
| **Backend** | Supabase Edge Functions (Deno) + RLS + Triggers |
| **IA** | OpenRouter (Gemini 2.5 Flash) via `petron-os-generate` |
| **Integracoes** | Meta Ads OAuth, Autentique (contratos), Clint (webhook CRM) |
| **Deploy** | Vercel + GitHub (CI/CD automatico) |
| **Modulos** | 9 modulos principais |

### Modulos do Sistema

| # | Modulo | O que faz |
|---|--------|-----------|
| 1 | **Dashboard Executivo** | Visao 360 com KPIs de receita, churn, health score, pipeline |
| 2 | **CRM / Vendas** | Pipeline de vendas, deals, contatos, lead scoring, funis, metas |
| 3 | **Producao de Conteudo** | Batches mensais, posts, assignments, revisoes, dashboard de produtividade |
| 4 | **Trafego Pago** | Rotinas diarias, metricas Meta Ads, saldos, otimizacoes, playbooks |
| 5 | **Customer Success** | Onboarding, NPS, risk cases, reunioes, health score, command center |
| 6 | **Contratos** | Geracao, envio para assinatura (Autentique), tracking de status |
| 7 | **Financeiro** | MRR, receita por cliente, projecoes |
| 8 | **Petron OS** | Arsenal de ferramentas IA generativa para a equipe |
| 9 | **Configuracoes** | Usuarios, permissoes, nichos, templates, webhooks |

### Equipe (9 pessoas)

| Nome | Cargo | O que faz no sistema |
|------|-------|---------------------|
| **Guilherme Rosso** | Admin / Fundador | Dashboard executivo, configuracoes, visao geral de todos os modulos |
| **Clara** | Designer | Producao de conteudo — cria posts (design), recebe assignments |
| **Vinicius** | Designer | Producao de conteudo — cria posts (design), recebe assignments |
| **Felipe** | Videomaker | Producao de conteudo — cria posts (video/reels), recebe assignments |
| **Amanda** | Social Media | Planeja batches, escreve legendas, briefings, revisoes, aprovacao |
| **Ana Luiza** | Social Media | Planeja batches, escreve legendas, briefings, revisoes, aprovacao |
| **Alefi** | Gestor de Trafego | Rotinas diarias, otimizacoes, check-ins, metricas Meta, playbooks |
| **Joao** | Gestor de Trafego | Rotinas diarias, otimizacoes, check-ins, metricas Meta, playbooks |
| **Talita** | Gestora de Trafego | Rotinas diarias, otimizacoes, check-ins, metricas Meta, playbooks |

### Numeros da Operacao (dados reais do banco)

| Metrica | Valor |
|---------|-------|
| Clientes ativos | **54** |
| Posts entregues (total historico) | **240** |
| Batches criados (total historico) | **44** |
| Onboardings em andamento | **7** |
| Deals abertos no CRM | **1** |
| Ferramentas IA ativas (Petron OS) | **12** |
| Categorias de ferramentas IA | **3** (Redes Sociais, Copy, Documentos Estrategicos) |
| Geracoes IA realizadas | **1** |
| Volume estimado mensal | **~12 posts/cliente/mes = ~648 posts/mes** |
| Posts por dia util (estimativa) | **~32 posts/dia para 2 designers + 1 videomaker** |

---

## PARTE 2 — O QUE FOI CORRIGIDO (sessao de auditoria 06/04/2026)

### 2.1 Bugs Corrigidos (86 issues identificadas)

**Dados Desconexos (problema central):**
- Churn contado de 3 fontes diferentes com 3 numeros diferentes — unificado para `accounts.churned_at`
- Contagem de clientes ativos com filtros inconsistentes entre 5 hooks — padronizado com `deleted_at IS NULL` + `cliente_interno` filtrado
- Health score com 3 sistemas paralelos sem sincronizacao — trigger de sincronizacao criado
- Onboarding com 4 tabelas e 4 status diferentes — `onboardings` eleita como fonte unica

**Categorias dos bugs corrigidos:**

| Categoria | Qtd | Exemplos |
|-----------|-----|----------|
| Dados desconexos entre modulos | 12 | Churn divergente, contagem de clientes inflada, MRR com deletados |
| Status incorretos / hardcoded | 8 | `'ativo'` em vez de `'active'`, BaseHealthScore com `'canceled'` em vez de `'churned'` |
| Features placeholder / TODO | 9 | NPS Medio "Em breve", progresso playbooks = 0, delta clientes = 0 |
| Fluxos quebrados entre modulos | 7 | Deal ganho nao cria cliente, contrato assinado nao atualiza status |
| Filtros ausentes em queries | 6 | CrmContext sem filtro deleted_at, graficos com clientes internos |
| Codigo morto | 4 | SalesFunnelKanban.tsx sem rota, DealConversationsTab placeholder |
| Navegacao e UX | 5 | Scroll nao reseta, URL nao persiste filtro, back button quebrado |
| Outros | 35 | Validacoes ausentes, campos nao conectados, triggers faltando |

### 2.2 Dados Unificados — Fonte Unica de Verdade

| Dado | Antes | Depois |
|------|-------|--------|
| **Churn** | 3 fontes (accounts.churned_at, cs_cancellations, CrmContext sem filtro) | 1 fonte: `accounts.churned_at` com filtros padrao |
| **Clientes ativos** | 5 hooks com filtros diferentes | Hook centralizado `useAccountsQuery()` com `deleted_at IS NULL` + `cliente_interno = false` |
| **Health score** | 3 sistemas (checkup_classificacao, health_score/health_status, BaseHealthScore) | Trigger sincroniza `checkup_classificacao` para `health_status` |
| **Onboarding** | 4 tabelas (onboardings, cs_client_onboarding, cs_onboardings, petron_customer_onboardings) | `onboardings` como fonte oficial |

### 2.3 Automacoes Implementadas (Triggers no Banco)

| Trigger | O que faz | Tabela |
|---------|-----------|--------|
| Deal ganho → cria account | Quando `crm_deals.status` muda para `won`, cria registro em `accounts` | `crm_deals` |
| Account criado → inicia onboarding | Quando novo `accounts` e inserido, cria `onboardings` com atividades do template | `accounts` |
| NPS detrator → cria risk case | Quando `cs_nps_responses.score` <= 6, cria caso em `cs_risk_cases` | `cs_nps_responses` |
| Contrato assinado → atualiza status | Quando `contracts.status` muda para `signed`, atualiza `accounts.status` | `contracts` |
| Onboarding concluido → agenda NPS | Quando `onboardings.status` muda para `concluido`, agenda NPS para 30 dias | `onboardings` |
| Health score sync | Sincroniza `checkup_classificacao` com `health_status` em atualizacoes | `accounts` |

### 2.4 Features Completadas

- NPS Medio no CS Command Center conectado a dados reais
- Progresso de Playbooks calculado a partir de tarefas concluidas vs total
- Delta de clientes ativos comparando com periodo anterior
- Correcao do Welcome Command Center (`'ativo'` → `'active'`)
- BaseHealthScore com filtro correto (`'churned'` em vez de `'canceled'`)
- CrmContext com filtros `deleted_at` e `cliente_interno`

### 2.5 Navegacao Corrigida

- Persistencia de URL com filtros (query params mantidos ao navegar)
- Error boundary implementado para evitar tela branca
- Scroll reseta ao topo ao trocar de pagina
- Back buttons funcionais em todas as paginas de detalhe

---

## PARTE 3 — CUSTOS ATUAIS EM FERRAMENTAS

| Ferramenta | Custo/mes | O que faz | Substituivel pelo ERP? |
|-----------|-----------|-----------|----------------------|
| Reportei Relatorios | R$ 400 | Relatorios mensais de midia (Meta Ads) | **SIM** — dados ja coletados, falta camada de apresentacao |
| Reportei Flux | R$ 700 | Agendamento de posts nas redes sociais | **SIM** (proximo passo) — integracao Meta API para publicacao |
| Canva | R$ 170 | Design + apresentacoes de aprovacao para clientes | **PARCIAL** — apresentacao de aprovacao sim, design criativo nao |
| CapCut | R$ 70 | Edicao de video (Reels, Stories) | **NAO** — ferramenta criativa essencial |
| Adobe | R$ 300 | Design profissional (Illustrator, Photoshop) | **NAO** — ferramenta criativa essencial |
| Clint CRM | R$ 1.200 | CRM de vendas, comunicacao com leads | **SIM** (proximo passo) — ERP ja tem CRM completo, falta WhatsApp |
| Autentique | R$ 0 | Assinatura digital de contratos | **Ja integrado** — webhook funcional |
| **TOTAL** | **R$ 2.840** | | **Economia potencial: R$ 2.300/mes** |

---

## PARTE 4 — GARGALOS OPERACIONAIS MAPEADOS

### 4.1 Producao de Conteudo

| Gargalo | Impacto | Frequencia |
|---------|---------|------------|
| Designers erram portugues nas legendas | Retrabalho: SM precisa revisar e corrigir cada legenda | Diario |
| Aprovacao manual (Canva → PDF → WhatsApp) | SM gasta ~45min/cliente/mes criando apresentacao | Mensal (x54 clientes) |
| Briefing muitas vezes incompleto | Designer precisa perguntar detalhes, perde tempo | Diario |
| Sem visao "Meu Dia" pro designer | Designer escolhe tarefas aleatoriamente, sem priorizacao | Diario |
| Volume alto: ~648 posts/mes | ~32 posts/dia util para 2 designers + 1 videomaker | Continuo |
| Dois sistemas de conteudo coexistindo | `content_items` vs `content_batches/content_posts` — confusao | Estrutural |
| Extra requests nao aparecem no pipeline | Designer precisa checar dois lugares | Semanal |

### 4.2 Gestao de Trafego

| Gargalo | Impacto | Frequencia |
|---------|---------|------------|
| Relatorios manuais no Reportei | ~20h/mes dos gestores gerando relatorios | Mensal |
| Sem coleta automatica diaria de metricas | Edge Functions existem mas nao estao ativas no cron | Diario |
| Check-in sem validacao de completude | Gestor pode salvar sem verificar saldo | Diario |
| Sem rastreamento Google Ads (so Meta) | Clientes com Google Ads ficam sem dados | Continuo |
| Token Meta sem renovacao automatica | Quando expira, todos os dados param | Esporadico (critico) |
| Otimizacoes registram tempo, nao decisao | Sem campo "o que foi feito" — so tempo gasto | Diario |

### 4.3 Customer Success

| Gargalo | Impacto | Frequencia |
|---------|---------|------------|
| NPS sem disparo automatico | Depende de acao manual do CS para coletar | Mensal |
| Sem portal do cliente | Cliente nao ve status do conteudo, envia mensagens no WhatsApp | Diario |
| Reunioes so registram passado | Nao agendam proxima reuniao automaticamente | Quinzenal |
| Risk cases sem SLA por nivel | Caso critico nao tem prazo de resposta definido | Esporadico |
| Sem escalacao automatica de casos abertos | Caso pode ficar aberto indefinidamente | Continuo |
| Health score individual sem recalculo automatico | Score desatualizado ate acao manual | Continuo |

### 4.4 Comercial

| Gargalo | Impacto | Frequencia |
|---------|---------|------------|
| Funil outbound marcado como "em construcao" | Sem prospecao ativa pelo sistema | Continuo |
| MQL inserido manualmente | Sem integracao com fontes de leads | Semanal |
| Metas do funil sem validacao de coerencia matematica | Metas podem ser inconsistentes | Mensal |
| Sem formularios de captura de leads | Leads entram manualmente | Continuo |
| Sem cadencias de follow-up automaticas | Follow-up depende de memoria do vendedor | Diario |

---

## PARTE 5 — TUDO QUE PODE SER AUTOMATIZADO

### 5.1 Automacoes de Conteudo

| # | Automacao | Hoje (manual) | Amanha (automatico) | Impacto | Esforco | Prioridade |
|---|-----------|---------------|---------------------|---------|---------|------------|
| C1 | **Spell check IA em legendas** | SM revisa manualmente cada legenda | Botao "Revisar texto" usa `petron-os-generate` com prompt de correcao PT-BR, mostra diff | ~40h/mes economizadas (SM + designer) | 3-4 dias | **P1** |
| C2 | **Geracao de legenda IA** | SM escreve legenda do zero para cada post | Botao "Gerar legenda" envia titulo + briefing + nicho para IA gerar primeiro rascunho. Campo `legenda_sugerida` ja existe | ~80h/mes economizadas | 3-4 dias | **P1** |
| C3 | **Geracao de briefing IA** | SM escreve briefing manualmente baseado em experiencia | IA gera briefing baseado no historico do cliente, nicho, tipo de post, sazonalidade | ~30h/mes economizadas | 1 semana | **P1** |
| C4 | **Calendario editorial automatico** | SM planeja manualmente quais posts criar no mes | IA sugere calendario baseado em datas comemorativas, nicho MatCon, historico | ~15h/mes economizadas | 1 semana | **P2** |
| C5 | **Apresentacao de aprovacao automatica** | SM cria no Canva, exporta PDF, envia WhatsApp | Sistema gera pagina web com todos os posts do batch, link publico para cliente aprovar | ~50h/mes economizadas + elimina Canva parcial (R$170) | 2-3 semanas | **P1** |
| C6 | **Envio automatico pro WhatsApp** | SM envia link manualmente | Trigger envia mensagem WhatsApp quando batch muda para "review" | ~5h/mes | 3 dias (apos WhatsApp API) | **P3** |
| C7 | **Notificacao quando post concluido** | Ninguem e avisado quando designer termina | Notificacao in-app + email quando post muda para "done" | Reducao de atraso | 2 dias | **P2** |
| C8 | **Validacao de qualidade antes do "done"** | Post pode ser marcado como done sem legenda, sem imagem | Gate obrigatorio: legenda preenchida? arquivo anexado? spell check rodou? | ~15h/mes de retrabalho evitado | 2 dias | **P2** |

### 5.2 Automacoes de Trafego

| # | Automacao | Hoje (manual) | Amanha (automatico) | Impacto | Esforco | Prioridade |
|---|-----------|---------------|---------------------|---------|---------|------------|
| T1 | **Coleta automatica diaria de metricas Meta** | Cron existe (`meta-fetch-metrics`, `meta-refresh-balances-cron`) mas nao esta ativo | Ativar cron diario no Supabase, dados alimentam relatorios automaticamente | Base para todas as automacoes de trafego | 3-4 dias | **P1** |
| T2 | **Relatorio mensal automatico com narrativa IA** | Gestor gera manualmente no Reportei, ~20h/mes | Sistema puxa dados de `ad_account_metrics_daily`, IA gera narrativa, exporta PDF | ~30h/mes + elimina Reportei (R$400/mes) | 2-3 semanas | **P1** |
| T3 | **Alerta automatico de saldo baixo** | Gestor verifica manualmente saldos | Quando saldo < 20% da verba → cria tarefa no playbook + notificacao | Evita pausa de campanhas | 3 dias | **P2** |
| T4 | **Sugestao de otimizacao baseada em metricas** | Gestor analisa metricas e decide o que otimizar | IA analisa tendencias (CPC subindo, CTR caindo) e sugere acoes | Melhora performance de campanhas | 1 semana | **P3** |
| T5 | **Integracao Google Ads** | Sem dados de Google Ads no sistema | OAuth Google Ads + coleta de metricas em `ad_account_metrics_daily` com `platform='google'` | Cobertura completa de midia | 2-3 semanas | **P3** |

### 5.3 Automacoes de CS

| # | Automacao | Hoje (manual) | Amanha (automatico) | Impacto | Esforco | Prioridade |
|---|-----------|---------------|---------------------|---------|---------|------------|
| S1 | **NPS automatico 30 dias apos onboarding** | CS envia NPS manualmente | Trigger ja criado: `onboarding concluido → agenda NPS` | Nenhum cliente sem NPS | Ja implementado (trigger) | **P1** |
| S2 | **Detrator → risk case automatico** | CS cria caso manualmente ao ver NPS baixo | Trigger ja criado: `NPS <= 6 → cria cs_risk_cases` | Nenhum detrator ignorado | Ja implementado (trigger) | **P1** |
| S3 | **Relatorio de saude do cliente automatico** | CS avalia subjetivamente | Sistema calcula score baseado em: entregas no prazo, NPS, metricas de trafego, reunioes | Visao objetiva de saude | 1 semana | **P2** |
| S4 | **Agendamento de reuniao recorrente** | CS agenda manualmente cada reuniao | Ao concluir reuniao, sistema sugere/agenda proxima automaticamente | Nenhum cliente sem acompanhamento | 3 dias | **P2** |
| S5 | **Portal do cliente** | Cliente pergunta status no WhatsApp | Pagina publica com: status do batch, calendario, metricas, historico, NPS | ~20h/mes menos comunicacao manual | 4-5 semanas | **P2** |

### 5.4 Automacoes Comerciais

| # | Automacao | Hoje (manual) | Amanha (automatico) | Impacto | Esforco | Prioridade |
|---|-----------|---------------|---------------------|---------|---------|------------|
| V1 | **Deal ganho → conta + onboarding** | Vendedor cria cliente manualmente | Trigger parcial ja existe. Fluxo completo: deal won → account → onboarding → contrato → primeiro batch | Pipeline conectado | 1 semana (completar) | **P1** |
| V2 | **Contrato assinado → ativar conta** | Alguem atualiza status manualmente | Trigger ja criado: `contracts.status = 'signed' → accounts.status = 'active'` | Status sempre atualizado | Ja implementado (trigger) | **P1** |
| V3 | **Follow-up automatico de deals parados** | Vendedor lembra (ou esquece) de fazer follow-up | Sistema detecta deals sem atividade ha X dias → cria tarefa + notificacao | Nenhum deal esquecido | 3 dias | **P2** |
| V4 | **Relatorio de pipeline automatico** | Visao manual do funil | Dashboard com previsao de receita, taxa de conversao por etapa, tempo medio | Decisoes baseadas em dados | 1 semana | **P2** |

### 5.5 Petron OS — Arsenal de Ferramentas IA

**Ferramentas ativas hoje (12):**

| Ferramenta | Tipo | Categoria |
|-----------|------|-----------|
| Analise de Concorrencia | construtor | Documentos Estrategicos |
| Bio de Instagram | rapida | Redes Sociais |
| Briefing de Posicionamento | construtor | Documentos Estrategicos |
| Cronograma de Redes Sociais | rapida | Redes Sociais |
| Framework AIDA | rapida | Copy |
| Framework BAB | rapida | Copy |
| Framework PAS | rapida | Copy |
| ICP — Cliente Ideal | construtor | Documentos Estrategicos |
| Ideias de Stories | rapida | Redes Sociais |
| Legendas de Posts | rapida | Redes Sociais |
| Planejamento de Marketing | construtor | Documentos Estrategicos |
| Texto Persuasivo Livre | rapida | Copy |

**Ferramentas que devem ser criadas:**

**Copy e Conteudo:**

| # | Ferramenta | Tipo | O que faz | Prioridade |
|---|-----------|------|-----------|------------|
| IA1 | Gerador de copy Meta Ads | rapida | Headline + descricao + CTA para anuncios Facebook/Instagram | **P1** |
| IA2 | Gerador de copy Google Ads responsivo | rapida | 15 headlines + 4 descricoes para RSA | **P2** |
| IA3 | Roteiro de Reels/Video | construtor | Cenas, tempo, narracao, transicoes, musica sugerida | **P1** |
| IA4 | Adaptador de texto por canal | rapida | Pega um texto e adapta para Instagram, Facebook, LinkedIn, Google | **P2** |
| IA5 | Corretor de portugues com sugestoes | rapida | Correcao ortografica + sugestoes de melhoria de tom MatCon | **P1** |
| IA6 | Gerador de hashtags por nicho MatCon | rapida | Hashtags otimizadas por nicho (pisos, revestimentos, tintas, etc.) | **P2** |
| IA7 | Gerador de CTA por objetivo | rapida | CTAs otimizados por objetivo (venda, lead, engajamento) | **P3** |

**Estrategia:**

| # | Ferramenta | Tipo | O que faz | Prioridade |
|---|-----------|------|-----------|------------|
| IA8 | Calendario editorial mensal automatico | construtor | Calendario completo com temas, datas, formatos por nicho MatCon | **P1** |
| IA9 | Briefing de campanha completo | construtor | Briefing estruturado com objetivo, publico, mensagem, metricas | **P2** |
| IA10 | Analise de sazonalidade MatCon | rapida | Identifica periodos de alta/baixa por nicho + sugestoes | **P3** |
| IA11 | Gerador de pauta tematica | rapida | Pautas baseadas em datas comemorativas + nicho MatCon | **P2** |
| IA12 | Planejamento de conteudo por persona | construtor | Conteudo segmentado por persona (arquiteto, engenheiro, consumidor final) | **P3** |

**Analise:**

| # | Ferramenta | Tipo | O que faz | Prioridade |
|---|-----------|------|-----------|------------|
| IA13 | Relatorio mensal com narrativa IA | construtor | Usa dados Meta reais de `ad_account_metrics_daily` para gerar narrativa | **P1** |
| IA14 | Diagnostico de perfil do cliente | construtor | Analisa historico de posts, metricas, NPS para diagnosticar perfil | **P2** |
| IA15 | Sugestao de otimizacao de trafego | rapida | Analisa metricas e sugere acoes concretas de otimizacao | **P2** |
| IA16 | Analise de concorrentes (ja existe) | construtor | Ja ativo — manter e melhorar com dados reais | Existente |

**Onboarding:**

| # | Ferramenta | Tipo | O que faz | Prioridade |
|---|-----------|------|-----------|------------|
| IA17 | Script de reuniao de onboarding | construtor | Roteiro personalizado baseado no nicho + servicos contratados | **P2** |
| IA18 | Checklist de setup por tipo de servico | rapida | Gera checklist automatico: conteudo, trafego, CS | **P2** |
| IA19 | Briefing inicial de identidade visual | construtor | Perguntas e estrutura para capturar identidade visual do cliente | **P3** |

### 5.6 Automacoes de Infraestrutura

| # | Automacao | Status | Impacto | Esforco | Prioridade |
|---|-----------|--------|---------|---------|------------|
| I1 | Deploy automatico (Vercel + GitHub) | **Ja funciona** | CI/CD continuo | — | Pronto |
| I2 | Backup automatico do banco | Supabase faz daily backups (plano Pro) | Seguranca de dados | — | Verificar plano |
| I3 | Monitoramento de erros | Error boundary no frontend, sem Sentry/LogRocket | Visibilidade de bugs em producao | 2 dias | **P2** |
| I4 | Renovacao automatica de token Meta | **Nao existe** — token expira e tudo para | Continuidade dos dados de trafego | 3 dias | **P1** |
| I5 | Rate limiting nas Edge Functions | Nao existe | Seguranca contra abuso | 1 dia | **P3** |

---

## PARTE 6 — CRONOGRAMA DE EXECUCAO

### Sprint 1 (Semana 1-2): IA no Conteudo

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| C1 — Spell check IA em legendas | 3-4 dias | ~40h/mes |
| C2 — Geracao de legenda IA (primeiro rascunho) | 3-4 dias | ~80h/mes |
| C3 — Geracao de briefing IA baseado no historico | 5 dias | ~30h/mes |
| Botoes integrados no PostDetail | 2 dias | UX |
| **Total Sprint 1** | **~2 semanas** | **~150h/mes** |

### Sprint 2 (Semana 3-4): Produtividade do Designer

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| Visao "Meu Dia" personalizada por designer | 2-3 dias | ~10h/mes |
| C8 — Validacao de qualidade antes do "done" | 2 dias | ~15h/mes |
| Dashboard de produtividade em tempo real | 2-3 dias | Visibilidade |
| Timer de producao por post | 3 dias | Dados de produtividade |
| **Total Sprint 2** | **~2 semanas** | **~25h/mes** |

### Sprint 3 (Semana 5-6): Relatorios Automatizados

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| T1 — Ativar cron de metricas Meta | 3-4 dias | Base de dados |
| I4 — Renovacao automatica de token Meta | 3 dias | Continuidade |
| T2 — Relatorio mensal automatico com narrativa IA | 2 semanas | ~30h/mes + R$400/mes |
| **Total Sprint 3** | **~2 semanas** | **~30h/mes + R$400/mes** |

### Sprint 4 (Semana 7-8): Petron OS Arsenal

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| IA1 — Gerador de copy Meta Ads | 2 dias | Produtividade trafego |
| IA3 — Roteiro de Reels/Video | 3 dias | Produtividade videomaker |
| IA5 — Corretor de portugues com sugestoes | 2 dias | Qualidade |
| IA8 — Calendario editorial mensal | 3 dias | ~15h/mes |
| IA13 — Relatorio com narrativa IA (integrado ao Sprint 3) | 3 dias | Integrado |
| Streaming nos resultados de IA | 2 dias | UX |
| **Total Sprint 4** | **~2 semanas** | **~15h/mes** |

### Sprint 5 (Semana 9-10): Portal do Cliente

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| C5 — Apresentacao de aprovacao automatica | 2 semanas | ~50h/mes |
| Link publico de aprovacao (sem login) | 3 dias | UX cliente |
| Eliminar Canva para apresentacoes (parcial) | — | R$170/mes |
| **Total Sprint 5** | **~2 semanas** | **~50h/mes + R$170/mes** |

### Sprint 6 (Semana 11-12): CRM Completo

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| Migrar funcionalidades restantes do Clint | 2 semanas | — |
| WhatsApp Business API (integracao basica) | 1 semana | — |
| Import/export de contatos CSV | 2 dias | — |
| Cadencias de follow-up automaticas | 3 dias | — |
| Eliminar Clint | — | R$1.200/mes |
| **Total Sprint 6** | **~2 semanas** | **R$1.200/mes** |

### Sprint 7 (Semana 13-14): Agendamento de Posts

| Tarefa | Esforco | Economia gerada |
|--------|---------|-----------------|
| Integracao Meta API para agendamento (Facebook + Instagram) | 3 semanas | — |
| Calendario visual com drag-and-drop | 1 semana | UX |
| Cron de publicacao automatica | 3 dias | — |
| Eliminar Reportei Flux | — | R$700/mes |
| **Total Sprint 7** | **~2 semanas** | **R$700/mes** |

### Backlog (futuro)

| Item | Esforco | Impacto |
|------|---------|---------|
| Google Ads integration completa | 2-3 semanas | Cobertura de midia |
| Portal do cliente completo (login, metricas, historico) | 4-5 semanas | Experiencia do cliente |
| App mobile para designers | 6-8 semanas | Produtividade em campo |
| Integracao com CapCut API | 2 semanas | Workflow videomaker |
| Formularios de captura de leads embeddable | 1 semana | Geracao de leads |
| NPS com link publico e disparo por email | 1 semana | Coleta automatica |
| Sistema de notificacoes in-app persistentes | 1 semana | Visibilidade de eventos |
| Kanban DnD funcional no pipeline de vendas | 1 semana | UX comercial |

---

## PARTE 7 — PROJECAO FINANCEIRA

### Economia em Ferramentas (cumulativa)

| Mes | Acao | Economia mensal | Economia acumulada (mensal) |
|-----|------|----------------|---------------------------|
| Mes 2 (Sprint 3) | Elimina Reportei Relatorios | R$ 400 | R$ 400 |
| Mes 3 (Sprint 5) | Elimina Canva (parcial — so apresentacoes) | R$ 170 | R$ 570 |
| Mes 3 (Sprint 6) | Elimina Clint CRM | R$ 1.200 | R$ 1.770 |
| Mes 4 (Sprint 7) | Elimina Reportei Flux | R$ 700 | R$ 2.470 |
| Mes 5+ | WhatsApp API (custo novo) | -R$ 150 | R$ 2.320 |
| **Total estabilizado** | | **R$ 2.320/mes** | **R$ 27.840/ano** |

### Economia em Horas (estimativa conservadora)

| Automacao | Sprint | Horas economizadas/mes | Quem se beneficia |
|-----------|--------|----------------------|-------------------|
| Spell check + legenda IA | Sprint 1 | ~40h | SM + Designers |
| Geracao de legenda IA | Sprint 1 | ~80h | Social Media |
| Briefing IA | Sprint 1 | ~30h | Social Media |
| Visao "Meu Dia" + validacao | Sprint 2 | ~25h | Designers |
| Relatorios automaticos | Sprint 3 | ~30h | Gestores de Trafego |
| Calendario editorial IA | Sprint 4 | ~15h | Social Media |
| Apresentacao de aprovacao automatica | Sprint 5 | ~50h | Social Media |
| Portal do cliente (reducao WhatsApp) | Backlog | ~20h | CS + SM |
| **Total** | | **~290h/mes** | **Toda equipe** |

A R$ 50/hora equivalente, isso representa **R$ 14.500/mes** em ganhos de produtividade.

**Nota:** Essas horas nao significam que a equipe trabalhara menos — significa que a mesma equipe podera atender mais clientes ou entregar com mais qualidade.

### ROI Total

| Componente | Valor mensal | Valor anual |
|-----------|-------------|-------------|
| Economia em ferramentas | R$ 2.320 | R$ 27.840 |
| Economia em horas (estimativa conservadora a R$50/h) | R$ 8.000 | R$ 96.000 |
| **Total conservador** | **R$ 10.320/mes** | **R$ 123.840/ano** |
| Economia em horas (estimativa otimista) | R$ 14.500 | R$ 174.000 |
| **Total otimista** | **R$ 16.820/mes** | **R$ 201.840/ano** |

### Timeline de Retorno

| Marco | Quando | Economia acumulada |
|-------|--------|-------------------|
| Primeiras automacoes de IA no conteudo | Semana 2 | ~150h/mes de produtividade |
| Eliminacao do Reportei Relatorios | Semana 6 | R$ 400/mes recorrente |
| Eliminacao do Canva (parcial) | Semana 10 | R$ 570/mes recorrente |
| Eliminacao do Clint CRM | Semana 12 | R$ 1.770/mes recorrente |
| Eliminacao do Reportei Flux | Semana 14 | R$ 2.470/mes recorrente |
| **Sistema completo estabilizado** | **Semana 16** | **R$ 2.320/mes + ~290h/mes** |

---

## APENDICE A — FERRAMENTAS IA EXISTENTES NO PETRON OS

**Categorias ativas:**
1. Redes Sociais
2. Copy
3. Documentos Estrategicos

**Total de geracoes realizadas:** 1 (sistema recem-implantado)

**Endpoint:** `petron-os-generate` — usa OpenRouter com Gemini 2.5 Flash, suporta streaming.

---

## APENDICE B — INTEGRAÇÕES JA EXISTENTES E REAPROVEITAVEIS

| Integracao | Edge Functions | Status | Reutilizavel para |
|-----------|---------------|--------|-------------------|
| **Meta Ads OAuth** | `meta-oauth-start`, `meta-oauth-callback` | Funcional | Agendamento de posts, metricas, relatorios |
| **Meta Metricas** | `meta-fetch-metrics`, `meta-fetch-finance`, `meta-refresh-balances-cron`, `meta-sync-all-cron` | Parcial (cron inativo) | Relatorios automaticos, alertas de saldo |
| **IA Generativa** | `petron-os-generate` | Funcional | Spell check, legendas, briefings, copy ads, relatorios narrativos |
| **Autentique** | `autentique-send`, `autentique-webhook` | Funcional | Contratos automaticos |
| **Clint Webhook** | `clint-create-client` | Funcional | Migracao gradual do Clint |
| **Supabase Storage** | — | Funcional | Aprovacao visual, portfolio, relatorios PDF |
| **Supabase Auth + RLS** | — | Funcional | Portal do cliente, links publicos seguros |
| **Supabase Realtime** | — | Disponivel | Notificacoes in-app, atualizacoes em tempo real |

---

## APENDICE C — TABELAS CHAVE DO BANCO DE DADOS

| Modulo | Tabelas principais |
|--------|-------------------|
| **CRM** | `crm_deals`, `crm_contacts`, `crm_activities`, `crm_cadences`, `crm_cadence_steps` |
| **Conteudo** | `content_batches`, `content_posts`, `content_assignments`, `content_revisions`, `content_post_files` |
| **Trafego** | `traffic_routines`, `traffic_daily_entries`, `ad_account_metrics_daily`, `meta_ad_account_snapshots` |
| **CS** | `onboardings`, `cs_nps_surveys`, `cs_nps_responses`, `cs_risk_cases`, `cs_meetings` |
| **Contratos** | `contracts` |
| **Contas** | `accounts` |
| **Petron OS** | `petron_os_ferramentas`, `petron_os_categorias`, `petron_os_geracoes` |
| **Vendas** | `petron_sales_funnels`, `petron_sales_funnel_stages`, `petron_sales_funnel_actuals` |

---

*Este documento e a referencia mestre para todo o trabalho futuro no ERP Petron. Atualizar a cada sprint concluida.*
