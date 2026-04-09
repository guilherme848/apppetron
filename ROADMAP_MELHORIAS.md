# Roadmap de Melhorias — ERP Petron

**Data:** 06/04/2026
**Elaborado para:** Guilherme Rosso — Petron Marketing

---

## Resumo Executivo

O ERP Petron ja possui uma base robusta: CRM com pipeline completo, producao de conteudo com batches/posts/assignments, trafego com integracao Meta Ads (OAuth, metricas, saldos), Customer Success com onboarding/NPS/risco, contratos com Autentique, e o Petron OS com IA generativa. A integracao com Clint ja existe via webhook.

**Custo mensal atual com ferramentas:** R$ 2.840
**Custo estimado apos otimizacoes:** R$ 540
**Economia mensal projetada:** R$ 2.300
**Economia anual projetada:** R$ 27.600

---

## FASE 1 — QUICK WINS (1-2 semanas cada)

### 1.1 Spell Check com IA nas Legendas e Briefings
- **O que faz:** Botao "Revisar texto" nos campos `caption`, `briefing` e `briefing_rich` dos posts de conteudo. Usa o endpoint `petron-os-generate` (ja existente) com um system_prompt focado em correcao ortografica PT-BR. Mostra diff antes de aplicar.
- **Esforco:** 3-4 dias
- **Impacto:** Reduz retrabalho dos designers em ~30%. Com 636 posts/mes, mesmo 5min economizados por post = ~53h/mes
- **Economia:** ~53h/mes de retrabalho (designers + SM)
- **Prioridade:** 1 (critico)
- **Dependencias:** Nenhuma — endpoint `petron-os-generate` ja funciona

### 1.2 Sugestao de Legenda por IA
- **O que faz:** Botao "Gerar legenda" no formulario de post. Envia titulo, briefing, canal e nicho do cliente para o Petron OS gerar uma primeira versao da legenda. Grava em `legenda_sugerida` (campo ja existe na tabela `content_posts`).
- **Esforco:** 3-4 dias
- **Impacto:** SM gasta ~15min por legenda. Com 636 posts/mes = ~159h/mes. Mesmo cortando pela metade = ~80h/mes economizadas
- **Economia:** ~80h/mes
- **Prioridade:** 1
- **Dependencias:** Nenhuma — campos `legenda_sugerida` e `sugerido_por_ia` ja existem no banco

### 1.3 Fila Diaria do Designer com Priorizacao Automatica
- **O que faz:** Na pagina de tarefas (ContentTasks), adicionar view "Minha Fila Hoje" que ordena posts por: (1) data de entrega do batch, (2) prioridade do cliente (valor contrato), (3) tempo em fila. Mostra contagem de posts por status.
- **Esforco:** 2-3 dias
- **Impacto:** Designer para de escolher tarefas aleatoriamente, foca no que importa
- **Economia:** ~10h/mes (reducao de atraso e decisoes erradas)
- **Prioridade:** 2
- **Dependencias:** Nenhuma

### 1.4 Gate de Qualidade Antes de Marcar Post como "Done"
- **O que faz:** Ao mover post para status "done", validar: (1) legenda preenchida? (2) anexo de arquivo existe? (3) spell check rodou? Se faltar algo, mostra aviso bloqueante.
- **Esforco:** 2 dias
- **Impacto:** Elimina posts entregues incompletos
- **Economia:** ~15h/mes de retrabalho evitado
- **Prioridade:** 2
- **Dependencias:** Item 1.1 (spell check)

### 1.5 Dashboard de Produtividade em Tempo Real por Designer
- **O que faz:** O ContentDashboard ja tem tabs "Numeros Gerais" e "Produtividade Time". Adicionar: alerta visual quando designer esta abaixo da meta diaria (ex: <4 posts/dia), ranking semanal, e indicador de retrabalho (usando `content_revisions`).
- **Esforco:** 2-3 dias
- **Impacto:** Visibilidade imediata para gestao
- **Economia:** Indireto — melhora produtividade geral em ~15%
- **Prioridade:** 2
- **Dependencias:** Nenhuma — tabelas `content_revisions` e `petron_content_job_history` ja existem

---

## FASE 2 — SUBSTITUICAO DE FERRAMENTAS (2-4 semanas cada)

### 2.1 Portal de Aprovacao do Cliente (substitui Canva PDF + WhatsApp)
**Economia: R$ 0 direto, mas ~40h/mes de trabalho manual**

- **O que faz:** Pagina publica (sem login) acessivel por link unico tipo `/aprovacao/{batch_id}/{token}`. Mostra todos os posts do batch com: imagem/video, legenda, canal, formato. Cliente pode: aprovar tudo, solicitar alteracao em post especifico (com campo de texto), ou aprovar parcialmente.
- **Como funciona:**
  - Nova tabela `batch_approval_tokens` (batch_id, token UUID, expires_at, client_email)
  - Pagina publica React renderiza os posts com anexos do Supabase Storage
  - Alteracoes solicitadas gravam em `content_revisions` e movem batch para status "changes"
  - Notificacao automatica (webhook) quando cliente aprova/solicita mudanca
- **Esforco:** 2-3 semanas
- **Impacto:** Elimina o ciclo: SM cria apresentacao Canva -> exporta PDF -> envia WhatsApp -> recebe feedback por audio/texto -> transcreve -> aplica. Isso consome ~45min por cliente por mes. Com 53 clientes = ~40h/mes
- **Prioridade:** 1 (maior impacto operacional)
- **Dependencias:** Nenhuma

### 2.2 Relatorios Automatizados (substitui Reportei — R$ 400/mes)
**Economia: R$ 400/mes**

- **O que faz:** Gera relatorio mensal por cliente usando dados ja coletados pela integracao Meta Ads existente. O sistema ja tem `ad_account_metrics_daily`, `meta_ad_account_snapshots`, e `meta-fetch-metrics` (Edge Function). Falta apenas a camada de apresentacao.
- **Como funciona:**
  - Nova pagina "Relatorios" com template por cliente
  - Puxa dados de `ad_account_metrics_daily` (impressoes, cliques, gastos, conversoes, CPC, CPM, CTR)
  - Adiciona metricas de conteudo: posts entregues, posts publicados, engajamento
  - Gera PDF exportavel ou link publico para o cliente
  - Agendamento mensal via cron (Supabase) para gerar automaticamente
- **Esforco:** 2-3 semanas
- **Impacto:** Elimina Reportei Reports (R$ 400/mes) + ~20h/mes gerando relatorios
- **Prioridade:** 1
- **Dependencias:** Meta Ads Integration (ja existe)

### 2.3 Agendamento de Posts (substitui Reportei Flux — R$ 700/mes)
**Economia: R$ 700/mes**

- **O que faz:** Integra com Meta Graph API (Instagram/Facebook) para agendar publicacoes diretamente do ERP. O sistema ja tem OAuth Meta configurado.
- **Como funciona:**
  - Endpoint: `POST /{page-id}/feed` (Facebook) e `POST /{ig-user-id}/media` + `POST /{ig-user-id}/media_publish` (Instagram)
  - Nova coluna `scheduled_at` e `published_at` em `content_posts`
  - Nova coluna `social_page_id` e `ig_user_id` em `accounts`
  - Edge Function `schedule-post` que usa o token Meta ja armazenado
  - Interface: calendario visual com drag-and-drop para agendar
  - Cron job que publica posts agendados automaticamente
- **Esforco:** 3-4 semanas
- **Prioridade:** 2
- **Dependencias:** Meta OAuth ja existe; precisa solicitar permissoes adicionais (`pages_manage_posts`, `instagram_content_publish`)
- **Risco:** API do Instagram tem limitacoes para Stories e Reels (precisa fallback manual para esses formatos)

### 2.4 Substituicao Completa do Clint CRM (R$ 1.200/mes)
**Economia: R$ 1.200/mes**

- **O que faz:** O ERP ja tem um modulo CRM robusto com: `crm_deals`, `crm_contacts`, `crm_activities`, pipeline visual (SalesFunnelPage), dashboard de vendas, lead scoring, automacoes, templates, metas. Tambem ja tem webhook do Clint para criar clientes automaticamente.
- **Gap analysis — o que falta para substituir o Clint:**
  1. **WhatsApp integration:** Clint provavelmente eh usado para comunicacao via WhatsApp. Precisa integrar WhatsApp Business API (ver item 5.3)
  2. **Formularios de captura de leads:** Landing page ou widget embeddable que alimenta `crm_contacts` diretamente
  3. **Cadencias de follow-up automaticas:** O sistema ja tem `crm_cadences` e `crm_cadence_steps`. Precisa ativar envio automatico
  4. **Import/export de contatos:** CSV upload/download
- **Esforco:** 2-3 semanas (para fechar os gaps)
- **Prioridade:** 2 (maior economia individual, mas requer migracao cuidadosa)
- **Dependencias:** Item 5.3 (WhatsApp API) para paridade total
- **Plano de migracao:**
  - Semana 1: Fechar gaps de funcionalidade
  - Semana 2: Rodar CRM Petron em paralelo com Clint por 30 dias
  - Semana 3-4: Migrar dados historicos e cancelar Clint

### 2.5 Canva / Adobe / CapCut — Otimizacao de Workflow
**Economia: R$ 0 (ferramentas criativas nao podem ser substituidas)**

- **O que faz:** Nao substitui as ferramentas, mas reduz tempo de uso:
  - Integracao Canva API: botao "Abrir no Canva" direto do post, com template pre-selecionado por nicho
  - Upload automatico do arquivo final do Canva para o Supabase Storage (via Canva webhook)
  - Template gallery no ERP: biblioteca de templates por nicho MatCon
- **Esforco:** 1-2 semanas
- **Prioridade:** 3
- **Dependencias:** Canva API (requer Canva Enterprise ou Connect API)

---

## FASE 3 — PRODUTIVIDADE DOS DESIGNERS (2-4 semanas)

### 3.1 Briefing Automatico com IA
- **O que faz:** Para cada post novo, gera automaticamente um briefing baseado em: nicho do cliente, tipo de post (feed/reels/stories), canal, historico de posts anteriores do cliente, e base de conhecimento MatCon.
- **Esforco:** 1 semana
- **Economia:** ~30h/mes (SM nao precisa escrever briefing do zero)
- **Prioridade:** 1
- **Dependencias:** Item 1.2 (usa mesma infraestrutura de IA)

### 3.2 Checklist de Entrega por Tipo de Post
- **O que faz:** Para cada `item_type` (design, video, other) e `format` (feed, reels, stories, carrossel), define checklist obrigatoria antes de marcar como "done". Ex: Video Reels precisa de: legenda, thumbnail, hashtags, musica definida, duracao < 90s.
- **Esforco:** 3-4 dias
- **Economia:** Reduz retrabalho em ~25%
- **Prioridade:** 2
- **Dependencias:** Nenhuma

### 3.3 Timer de Producao por Post
- **O que faz:** Registra tempo real gasto em cada post. Usa `started_at` e `completed_at` (ja existem). Adiciona botao "Iniciar/Pausar" com timer visivel. Alimenta dashboard de produtividade com media de tempo por tipo de post.
- **Esforco:** 3-4 dias
- **Economia:** Visibilidade para otimizar alocacao
- **Prioridade:** 3
- **Dependencias:** Nenhuma

### 3.4 Banco de Ideias de Conteudo por Nicho
- **O que faz:** Repositorio de ideias de conteudo categorizado por nicho MatCon (pisos, revestimentos, tintas, louças, etc). Alimentado por IA + curadoria manual. SM pode "puxar" ideias ao planejar batch.
- **Esforco:** 1 semana
- **Economia:** ~15h/mes no planejamento
- **Prioridade:** 3
- **Dependencias:** Tabela `niches` ja existe

---

## FASE 4 — EXPERIENCIA DO CLIENTE (4-6 semanas)

### 4.1 Dashboard do Cliente (Portal Externo)
- **O que faz:** Pagina publica (com login simples ou link magico) onde o cliente ve:
  - Status do batch atual (em producao, em revisao, entregue)
  - Calendario de publicacoes agendadas
  - Metricas de trafego pago (gastos, leads, CPA) — dados ja coletados
  - Historico de conteudos produzidos
  - NPS e proximas reunioes agendadas
- **Esforco:** 4-5 semanas
- **Economia:** ~20h/mes (menos mensagens "como esta meu conteudo?" no WhatsApp)
- **Prioridade:** 2
- **Dependencias:** Itens 2.1 (aprovacao), 2.2 (relatorios)

### 4.2 Notificacoes Automaticas por WhatsApp
- **O que faz:** Envia mensagens automaticas nos momentos-chave:
  - "Seu lote de conteudo esta pronto para aprovacao" (com link do portal)
  - "Relatorio mensal disponivel" (com link)
  - "Reuniao de CS agendada para [data]"
  - "Seu anuncio atingiu [X] leads esta semana"
- **Esforco:** 1-2 semanas (apos WhatsApp API integrado)
- **Economia:** ~10h/mes de comunicacao manual
- **Prioridade:** 2
- **Dependencias:** Item 5.3 (WhatsApp Business API)

### 4.3 Formulario de NPS Automatizado
- **O que faz:** O sistema ja tem `cs_nps_surveys`. Falta: envio automatico por email/WhatsApp a cada X meses, pagina publica para resposta, e consolidacao no dashboard de CS.
- **Esforco:** 1 semana
- **Economia:** ~5h/mes + melhora retencao
- **Prioridade:** 3
- **Dependencias:** Nenhuma

---

## FASE 5 — AUTOMACOES E INTEGRACOES (ongoing)

### 5.1 Cron de Metricas Meta Ads (ja parcialmente implementado)
- **O que faz:** As Edge Functions `meta-fetch-metrics`, `meta-refresh-balances-cron`, e `meta-sync-all-cron` ja existem. Falta: (1) garantir que rodam diariamente via Supabase cron, (2) alertas automaticos quando gasto > budget, (3) alimentar relatorios automaticamente.
- **Esforco:** 3-4 dias
- **Prioridade:** 1
- **Dependencias:** Nenhuma

### 5.2 Google Ads Integration
- **O que faz:** Complementa Meta Ads com dados de Google Ads. O campo `ad_monthly_budget_google` ja existe na tabela `accounts`.
- **Como funciona:**
  - OAuth com Google Ads API
  - Edge Function para buscar metricas (impressoes, cliques, conversoes, custo)
  - Armazena em `ad_account_metrics_daily` com `platform = 'google'`
  - Consolida no relatorio junto com Meta
- **Esforco:** 2-3 semanas
- **Prioridade:** 3
- **Dependencias:** Nenhuma

### 5.3 WhatsApp Business API
- **O que faz:** Permite enviar mensagens programaticas (notificacoes de aprovacao, relatorios, lembretes de reuniao) e receber mensagens do cliente direto no ERP.
- **Opcoes:**
  - **WABA oficial (Meta):** Custo ~R$ 0,05-0,15 por mensagem template. Precisa de Business Verification.
  - **Providers (Z-API, Evolution API, Twilio):** Mais facil de integrar, custo similar.
- **Esforco:** 2-3 semanas
- **Custo estimado:** ~R$ 100-200/mes (baseado em ~2000 mensagens/mes)
- **Prioridade:** 2
- **Dependencias:** Nenhuma

### 5.4 Automacao de Onboarding Completo
- **O que faz:** O sistema ja tem onboarding com steps (`cs_onboardings`, `update_onboarding_step`). Automatizar: quando deal fecha no CRM -> cria conta -> dispara onboarding -> gera contrato (Autentique) -> cria primeiro batch de conteudo -> notifica equipe.
- **Esforco:** 1-2 semanas
- **Prioridade:** 2
- **Dependencias:** Nenhuma — todas as pecas ja existem, falta conecta-las

---

## CRONOGRAMA DE EXECUCAO

### Mes 1 (Abril 2026) — Quick Wins + Inicio Portal
| Semana | Item | Responsavel |
|--------|------|-------------|
| S1 | 1.1 Spell Check IA | Dev |
| S1 | 1.2 Sugestao Legenda IA | Dev |
| S2 | 1.3 Fila Diaria Designer | Dev |
| S2 | 1.4 Gate de Qualidade | Dev |
| S3-S4 | 2.1 Portal Aprovacao (inicio) | Dev |

### Mes 2 (Maio 2026) — Portal + Relatorios
| Semana | Item | Responsavel |
|--------|------|-------------|
| S1 | 2.1 Portal Aprovacao (conclusao) | Dev |
| S1 | 1.5 Dashboard Produtividade | Dev |
| S2-S3 | 2.2 Relatorios Automatizados | Dev |
| S4 | 5.1 Cron Metricas Meta | Dev |

### Mes 3 (Junho 2026) — CRM + Agendamento
| Semana | Item | Responsavel |
|--------|------|-------------|
| S1-S2 | 2.4 Gaps Clint CRM | Dev |
| S3-S4 | 2.3 Agendamento Posts (inicio) | Dev |

### Mes 4 (Julho 2026) — Agendamento + Automacoes
| Semana | Item | Responsavel |
|--------|------|-------------|
| S1-S2 | 2.3 Agendamento Posts (conclusao) | Dev |
| S2 | 3.1 Briefing Automatico IA | Dev |
| S3 | 5.4 Automacao Onboarding | Dev |
| S4 | 3.2 Checklist de Entrega | Dev |

### Mes 5-6 (Agosto-Setembro 2026) — Portal Cliente + WhatsApp
| Semana | Item | Responsavel |
|--------|------|-------------|
| M5 S1-S3 | 4.1 Dashboard Cliente | Dev |
| M5 S3-S4 | 5.3 WhatsApp Business API | Dev |
| M6 S1-S2 | 4.2 Notificacoes WhatsApp | Dev |
| M6 S3 | 4.3 NPS Automatizado | Dev |
| M6 S4 | 3.3 Timer de Producao | Dev |

---

## CALCULO DE ROI

### Economia Mensal com Ferramentas

| Ferramenta | Custo Atual | Custo Apos | Economia | Quando |
|-----------|-------------|------------|----------|--------|
| Reportei Reports | R$ 400 | R$ 0 | R$ 400 | Mes 2 |
| Reportei Flux | R$ 700 | R$ 0 | R$ 700 | Mes 4 |
| Clint CRM | R$ 1.200 | R$ 0 | R$ 1.200 | Mes 3 |
| Canva | R$ 170 | R$ 170 | R$ 0 | N/A |
| CapCut | R$ 70 | R$ 70 | R$ 0 | N/A |
| Adobe | R$ 300 | R$ 300 | R$ 0 | N/A |
| WhatsApp API (novo) | R$ 0 | +R$ 150 | -R$ 150 | Mes 5 |
| **TOTAL** | **R$ 2.840** | **R$ 690** | **R$ 2.150** | — |

### Economia Mensal com Tempo da Equipe

| Automacao | Horas/Mes | Valor (R$50/h) | Quando |
|-----------|-----------|-----------------|--------|
| Spell check reduz retrabalho | 53h | R$ 2.650 | Mes 1 |
| Sugestao de legenda IA | 80h | R$ 4.000 | Mes 1 |
| Portal aprovacao (elimina PDF+WhatsApp) | 40h | R$ 2.000 | Mes 2 |
| Relatorios automatizados | 20h | R$ 1.000 | Mes 2 |
| Briefing automatico | 30h | R$ 1.500 | Mes 4 |
| Reducao comunicacao manual | 10h | R$ 500 | Mes 5 |
| **TOTAL** | **233h** | **R$ 11.650** | — |

### Timeline de ROI

- **Investimento estimado em desenvolvimento:** ~500h de dev (6 meses)
- **Custo de desenvolvimento (se terceirizado a R$ 100/h):** R$ 50.000
- **Economia acumulada em ferramentas (6 meses):** R$ 9.950
- **Economia acumulada em tempo (6 meses):** R$ 49.550
- **Total economia 6 meses:** R$ 59.500
- **ROI em 6 meses:** 119% (retorno completo antes do mes 4)
- **Economia anual projetada (apos implementacao completa):** R$ 165.600 (ferramentas + tempo)

---

## MATRIZ DE PRIORIDADE

| # | Item | Impacto | Esforco | Prioridade |
|---|------|---------|---------|------------|
| 1.1 | Spell Check IA | Alto | Baixo | **P1** |
| 1.2 | Sugestao Legenda IA | Alto | Baixo | **P1** |
| 2.1 | Portal Aprovacao | Muito Alto | Medio | **P1** |
| 2.2 | Relatorios Auto | Alto | Medio | **P1** |
| 5.1 | Cron Metricas Meta | Medio | Baixo | **P1** |
| 3.1 | Briefing Auto IA | Alto | Baixo | **P1** |
| 2.4 | Substituir Clint | Muito Alto | Medio | **P2** |
| 2.3 | Agendamento Posts | Alto | Alto | **P2** |
| 1.3 | Fila Designer | Medio | Baixo | **P2** |
| 1.4 | Gate Qualidade | Medio | Baixo | **P2** |
| 1.5 | Dashboard Produtividade | Medio | Baixo | **P2** |
| 4.1 | Dashboard Cliente | Medio | Alto | **P2** |
| 5.3 | WhatsApp API | Medio | Medio | **P2** |
| 5.4 | Automacao Onboarding | Medio | Baixo | **P2** |
| 4.2 | Notificacoes WhatsApp | Medio | Baixo | **P2** |
| 3.2 | Checklist Entrega | Medio | Baixo | **P2** |
| 2.5 | Canva Workflow | Baixo | Medio | **P3** |
| 3.3 | Timer Producao | Baixo | Baixo | **P3** |
| 3.4 | Banco Ideias | Baixo | Medio | **P3** |
| 4.3 | NPS Automatizado | Baixo | Baixo | **P3** |
| 5.2 | Google Ads | Medio | Medio | **P3** |

---

## NOTAS TECNICAS

### O que ja existe e pode ser reaproveitado
1. **Meta Ads OAuth completo** — `meta-oauth-start`, `meta-oauth-callback`, tokens armazenados
2. **Meta metricas** — `meta-fetch-metrics`, `meta-fetch-finance`, `meta-refresh-balances-cron`, `meta-sync-all-cron`
3. **IA generativa** — `petron-os-generate` usando OpenRouter (Gemini 2.5 Flash), com streaming
4. **CRM completo** — deals, contacts, activities, cadences, scoring, funnels, dashboard
5. **Content pipeline** — batches, posts com status/assignee/timestamps, revisions, attachments, job history
6. **Webhook Clint** — `clint-create-client` ja recebe dados do Clint
7. **Autentique** — `autentique-send`, `autentique-webhook` para contratos
8. **CS completo** — onboarding com steps, NPS surveys, risk cases, meetings
9. **Supabase Storage** — ja usado para batch_attachments e content_post_files

### Stack para novas funcionalidades
- **Frontend:** React + Vite + TailwindCSS + shadcn/ui + Recharts + TanStack Query
- **Backend:** Supabase (Postgres + Edge Functions em Deno + Storage + Auth + Realtime)
- **IA:** OpenRouter via `petron-os-generate` (reutilizar para spell check, legendas, briefings)
- **APIs externas:** Meta Graph API (ja integrada), Google Ads API (a integrar), WhatsApp Business API (a integrar)

### Tabelas que precisam ser criadas
1. `batch_approval_tokens` — para portal de aprovacao
2. `client_reports` — relatorios gerados
3. `scheduled_posts` — ou colunas em content_posts (scheduled_at, published_at, social_page_id)
4. `whatsapp_messages` — historico de mensagens
5. `content_quality_checks` — registro de spell checks executados
6. `content_ideas_bank` — banco de ideias por nicho
