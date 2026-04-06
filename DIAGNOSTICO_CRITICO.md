# DIAGNÓSTICO CRÍTICO — ERP Petron
**Data:** 06/04/2026 | **Autor:** Claude Code (auditoria automatizada)

---

## PARTE 1 — DADOS DESCONEXOS (O problema central)

O ERP sofre de um problema estrutural: **cada módulo foi construído de forma independente pelo Lovable, sem uma camada de dados unificada**. O resultado são métricas que divergem entre telas, gerando desconfiança no sistema.

---

### 1.1 CHURN — 3 fontes diferentes, 3 números diferentes

| Onde aparece | Fonte de dados | Campo usado | Resultado |
|---|---|---|---|
| Dashboard Executivo — card "Churns" | `accounts` | `churned_at` no período | **Correto** |
| CS Overview / Command Center | `accounts` | `churned_at` no mês | **Correto** |
| CS Dashboard — "Cancelamentos no Mês" | `cs_cancellations` | `effective_cancel_date` | **Zero** (ninguém preenche manualmente) |
| Base Health Score — componente churn_rate | `accounts` | `status = 'canceled'` | **Zero** (bug: status deveria ser `churned`) |
| Gráfico Churn Mensal (Dashboard) | `accounts` via CrmContext | `churned_at` SEM filtro deleted_at/cliente_interno | **Inflado** (conta clientes internos e deletados) |

**Impacto:** O gestor vê churn real no Dashboard Executivo, zero no CS Dashboard, e número inflado no gráfico. Perde a confiança no sistema.

---

### 1.2 CONTAGEM DE CLIENTES ATIVOS — filtros inconsistentes

| Hook | deleted_at | cliente_interno | status |
|---|---|---|---|
| useExecutiveDashboard | IS NULL | filtrado | traz todos, filtra no JS |
| useCsOverview | IS NULL | filtrado | traz todos, filtra no JS |
| useCrmData (CrmContext) | **NÃO FILTRA** | **NÃO FILTRA** | traz todos |
| useCsDashboardMetrics | não filtra | filtrado | `= 'active'` direto |
| useWelcomeCommandCenter | IS NULL | filtrado | `= 'ativo'` **(BUG: português)** |

**Impacto:** O gráfico de MRR no Dashboard inclui clientes deletados e internos. O Welcome mostra zero clientes porque filtra `'ativo'` em vez de `'active'`.

---

### 1.3 HEALTH SCORE — 3 sistemas paralelos sem sincronização

| Sistema | O que mede | Onde aparece | Quem alimenta |
|---|---|---|---|
| `checkup_classificacao` (A/B/C/D) | Saúde individual por 7 dimensões | CS Overview, CS Command Center | Preenchido manualmente no onboarding |
| `health_score` / `health_status` | Score numérico por cliente | Command Center (KPIs de risco) | Desconhecido (nenhum código frontend atualiza) |
| Base Health Score | Saúde da carteira como um todo | Dashboard Executivo (card topo) | Calculado no frontend com 4 componentes |

**Impacto:** Um cliente pode ser "D" (crítico) no CS Overview mas "healthy" no Command Center. Números de "clientes em risco" divergem entre telas.

---

### 1.4 ONBOARDING — 4 tabelas, 4 status diferentes

| Tabela | Status possíveis | Quem usa |
|---|---|---|
| `onboardings` | em_andamento / concluido | CS Overview, CS Dashboard, CsOnboarding page |
| `cs_client_onboarding` | in_progress / completed | Command Center, Welcome |
| `cs_onboardings` | not_started / in_progress / completed | CsOnboardings hook |
| `petron_customer_onboardings` | draft / in_progress / completed / cancelled | Petron Onboarding |

**Impacto:** CS Dashboard conta onboardings de uma tabela, Command Center de outra. Triggers no banco criam registros em duas tabelas simultaneamente a cada novo cliente.

---

## PARTE 2 — FEATURES MORTAS E PLACEHOLDERS

| Feature | Local | Status |
|---|---|---|
| Aba "Conversas" no Deal | `DealConversationsTab.tsx` | Texto "Integração futura com WhatsApp" |
| NPS Médio no CS Command Center | `CsCommandCenter.tsx:154` | Hardcoded "—" com badge "Em breve" |
| Outbound Funnel | `OutboundFunnelPage.tsx` | Alert "Em construção" |
| Kanban DnD (SalesFunnelKanban.tsx) | Arquivo inteiro | Sem rota no App.tsx — código morto |
| Progresso de Playbooks | `useCommandCenter.ts:466` | `progress: 0 // TODO` |
| Alerta tarefas vencidas | `useCommandCenter.ts:482` | `hasOverdueTasks = false // TODO` |
| Delta clientes ativos | `useCommandCenter.ts:217` | `activeClientsDelta: 0 // TODO` |
| Card "Delegado" na Welcome | `useWelcomeData.ts:164` | Sempre zero (TODO) |
| Botão Exportar (Tráfego) | Corrigido nesta sessão | ✅ |

---

## PARTE 3 — FLUXOS QUEBRADOS

### 3.1 Deal ganho NÃO cria cliente
O vendedor fecha um deal no kanban de vendas. Nada acontece. Ele precisa ir manualmente ao CRM, criar o cliente, e não há link entre o deal e a conta criada. `crm_deals.contact_id` → `crm_contacts`, mas `accounts` é outra entidade sem FK para deals.

### 3.2 Cliente criado NÃO inicia onboarding automaticamente
O trigger no banco cria registros em `cs_onboardings` e `onboardings` simultaneamente, mas as atividades do onboarding (checklist) não são criadas automaticamente — dependem de ação manual no CS.

### 3.3 NPS detrator NÃO cria caso de risco
Score ≤ 6 classifica como detrator, mas não cria risk case automaticamente. O alerta `detractor_no_followup` aparece no dashboard mas sem ação vinculada.

### 3.4 Saldo baixo Meta NÃO gera tarefa
O sistema detecta saldo < 20% da verba, mas não cria tarefa no playbook nem notifica o gestor de tráfego.

### 3.5 Contrato assinado NÃO atualiza status do cliente
Webhook de Clicksign/Autentique atualiza o contrato para `signed`, mas o `accounts.status` permanece inalterado.

### 3.6 Creative Request de Tráfego NÃO aparece no board de Conteúdo
Dois sistemas paralelos (`traffic_creative_requests` e `content_extra_requests`) sem comunicação. O designer precisa checar dois lugares.

### 3.7 CS não enxerga entregas de conteúdo
CsClientDetail não tem aba de produção de conteúdo. O CS não sabe se posts foram entregues.

---

## PARTE 4 — GAPS DE PROCESSO POR MÓDULO

### Comercial/Vendas
- Sem etapa "No-show" no funil (agendou, não compareceu)
- Sem etapa "Proposta enviada" entre reunião e fechamento
- MQL inserido manualmente — sem integração com CRM de leads
- Metas do funil sem validação de coerência matemática
- Deal ganho no kanban não atualiza `petron_sales_funnel_actuals`

### Tráfego
- Dois modelos de rotina coexistindo (novo e legado) sem flag de qual usar
- Otimizações registram tempo, não decisão (sem campo "o que foi feito")
- Check-in sem validação de completude (pode salvar sem verificar saldo)
- Sem rastreamento Google Ads (só Meta)
- Sem histórico de saldo ao longo do mês
- Token Meta sem renovação automática — quando expira, tudo para

### Conteúdo
- Sem SLA de revisão configurável
- Revisões são texto livre — sem número, limite por contrato ou aprovação formal
- Mover batch de "review" → "to_deliver" não requer aprovação do cliente
- Extra requests entregues não aparecem no pipeline de produção
- Dois sistemas de conteúdo coexistindo (`content_items` vs batches)

### CS
- NPS 100% manual — sem disparo automático, sem link público para cliente
- Risk cases sem SLA por nível (crítico deveria ter resposta em 24h)
- Sem escalação automática de casos abertos há muito tempo
- Reuniões só registram passado — sem agendamento futuro
- Alerta "sem reunião" conta só `status=done`, ignora reuniões agendadas
- Health score individual sem recálculo automático

### Contratos
- Sem geração manual de contrato (depende 100% do webhook Clint)
- Envio para assinatura usa HTML direto em vez de PDF
- Sem botão "Enviar para Assinatura" na interface
- Cliente não encontrado por CNPJ/email = contrato falha silenciosamente

---

## PARTE 5 — CRONOGRAMA DE AJUSTES E MELHORIAS

### FASE 1 — FONTE ÚNICA DE VERDADE (Semana 1-2)
*Objetivo: eliminar dados desconexos*

| # | Tarefa | Impacto |
|---|---|---|
| 1.1 | Criar hook `useAccountsQuery()` centralizado com filtros padronizados (deleted_at, cliente_interno) | Elimina divergência de contagem entre módulos |
| 1.2 | Unificar churn: todos os módulos lêem `accounts.churned_at` | Churn consistente em todas as telas |
| 1.3 | Corrigir BaseHealthScore: filtrar `status = 'churned'` em vez de `'canceled'` | Health score da base correto |
| 1.4 | Corrigir CrmContext (useCrmData): adicionar filtros deleted_at e cliente_interno | Gráficos do Dashboard com dados limpos |
| 1.5 | Corrigir useWelcomeCommandCenter: `'ativo'` → `'active'` | Welcome page funcional |
| 1.6 | Deprecar `cs_cancellations` como fonte de churn no CsDashboard — usar `accounts.churned_at` | CS Dashboard alinhado com Dashboard Executivo |
| 1.7 | Unificar health score: criar trigger que sincronize `checkup_classificacao` → `health_status` | Um único número de "clientes em risco" |
| 1.8 | Deprecar tabelas de onboarding legadas: eleger `onboardings` como fonte única | Onboarding consistente em todas as telas |

### FASE 2 — AUTOMAÇÕES CRÍTICAS (Semana 3-4)
*Objetivo: eliminar trabalho manual que causa erros*

| # | Tarefa | Impacto |
|---|---|---|
| 2.1 | Deal ganho → auto-criar account + vincular deal ao account | Pipeline comercial conectado ao CRM |
| 2.2 | Account criado → auto-criar onboarding com atividades do template | Onboarding sem esquecimento |
| 2.3 | NPS detrator → auto-criar risk case | Nenhum detrator passa despercebido |
| 2.4 | Saldo baixo Meta → auto-criar tarefa no playbook do gestor | Gestor alertado proativamente |
| 2.5 | Contrato assinado (webhook) → atualizar status do account | Status do cliente sempre atualizado |
| 2.6 | Onboarding concluído → agendar primeiro NPS (30 dias) + reunião de acompanhamento | Ciclo CS automático |

### FASE 3 — FEATURES COMPLETAS (Semana 5-6)
*Objetivo: substituir placeholders por funcionalidade real*

| # | Tarefa | Impacto |
|---|---|---|
| 3.1 | NPS Médio no CS Command Center: conectar dados reais da tabela cs_nps_responses | KPI funcional |
| 3.2 | Progresso de Playbooks: calcular a partir de tarefas concluídas vs total | Visibilidade real do trabalho de tráfego |
| 3.3 | Delta de clientes ativos: comparar com período anterior | Tendência visível no Command Center |
| 3.4 | Risk cases: adicionar botões "Criar caso", "Atualizar status", SLA por nível | Gestão de risco acionável |
| 3.5 | Envio para assinatura digital: botão na interface + geração PDF real | Contratos enviados pelo ERP |
| 3.6 | Kanban de vendas: implementar DnD funcional no SalesFunnelsPage | Gestão visual do pipeline |
| 3.7 | Remover código morto: SalesFunnelKanban.tsx, Index.tsx, DealConversationsTab (ou implementar) | Codebase limpo |

### FASE 4 — INTEGRAÇÕES ENTRE MÓDULOS (Semana 7-8)
*Objetivo: módulos conversam entre si*

| # | Tarefa | Impacto |
|---|---|---|
| 4.1 | CS Client Detail: aba de Conteúdo mostrando posts/batches do cliente | CS enxerga entregas |
| 4.2 | Creative Requests de Tráfego → aparecer no board de Conteúdo | Fluxo unificado para designers |
| 4.3 | Dashboard Executivo: adicionar cards de pipeline de vendas, produção de conteúdo, tráfego | Visão 360° real |
| 4.4 | Tráfego Client Detail: mostrar criativos disponíveis do módulo de Conteúdo | Gestor sabe o que tem pra anunciar |
| 4.5 | Unificar CsDashboard e CsCommandCenter em uma única página | Sem confusão sobre "qual dashboard usar" |

### FASE 5 — DASHBOARD EXECUTIVO COMPLETO (Semana 9-10)
*Objetivo: visão 360° para a gestão*

| # | Tarefa | Impacto |
|---|---|---|
| 5.1 | Card: Pipeline de vendas (valor total, deals por etapa, previsão) | Visibilidade comercial |
| 5.2 | Card: Produção de conteúdo (posts entregues vs meta, batches em atraso) | Visibilidade operacional |
| 5.3 | Card: Tráfego (clientes com saldo baixo, tarefas vencidas, otimizações) | Visibilidade de mídia |
| 5.4 | Card: Onboardings (ativos, atrasados, tempo médio) | Visibilidade de CS |
| 5.5 | Card: NPS consolidado com tendência | Satisfação do cliente |
| 5.6 | Sistema de notificações in-app persistentes | Eventos críticos não passam despercebidos |

### FASE 6 — QUALIDADE E ESCALA (Semana 11-12)
*Objetivo: sistema robusto para crescimento*

| # | Tarefa | Impacto |
|---|---|---|
| 6.1 | Implementar NPS com link público e disparo automático por email | NPS sem trabalho manual |
| 6.2 | Otimizações de tráfego: campo "ação tomada" obrigatório | Log de decisão, não só de tempo |
| 6.3 | SLA de revisão de conteúdo com alertas visuais | Entregas no prazo |
| 6.4 | Google Ads no monitoramento de saldos | Cobertura completa de mídia |
| 6.5 | Renovação automática de token Meta | Sem interrupção de dados |
| 6.6 | Responsividade mobile nas tabelas e filtros | Uso em campo |
| 6.7 | Sistema de automações CRM com executor server-side (Edge Function cron) | Automações realmente executam |
| 6.8 | Geração manual de contrato pelo ERP (sem depender do Clint) | Autonomia operacional |

---

## RESUMO VISUAL

```
ESTADO ATUAL                          ESTADO DESEJADO (12 semanas)
─────────────                         ─────────────────────────────
Dados desconexos entre módulos    →   Fonte única de verdade
Fluxos manuais e desconectados    →   Automações entre módulos
Features placeholder              →   Features completas
Dashboard só de CS                →   Dashboard 360° (vendas+conteúdo+tráfego+CS)
3 sistemas de health score        →   1 sistema unificado
4 tabelas de onboarding           →   1 tabela oficial
Sem notificações                  →   Alertas in-app para eventos críticos
NPS manual                        →   NPS automatizado com link público
Contratos dependem do Clint       →   Geração + assinatura pelo ERP
```
