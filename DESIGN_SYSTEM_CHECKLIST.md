# Padrão Visual Obrigatório — Referência: CS Visão Geral

## Regra Global
Toda tela, componente, modal, card, tabela, gráfico, KPI, badge, filtro, botão ou elemento visual criado no sistema DEVE seguir este padrão. Sem exceção.

## KPI Cards
- Fundo: bg-card, borda 1px solid border, border-radius 16px, padding 20px
- Ícone: 20px dentro de círculo 36px, fundo [cor] 12% opacidade, posicionado no canto superior direito
- Label: 12px semibold uppercase letter-spacing 0.08em text-muted-foreground, alinhado topo esquerdo
- Valor: 32px extrabold font-mono (JetBrains Mono) text-foreground
- Sublabel: 13px regular text-muted-foreground
- Variação: 12px font-mono, verde ↑ se melhorou, vermelho ↓ se piorou
- Hover: borda primary/40, transição 150ms

## Cards Hero
- Fundo: bg-card, border-radius 16px, padding 24px
- Ícone: 20px dentro de círculo 40px, fundo [cor] 12%
- Label: 12px semibold uppercase text-muted-foreground
- Valor: 32px extrabold font-mono text-foreground
- Sublabel: 13px text-muted-foreground

## Tabelas
- Container: bg-card, border-radius 16px, padding 20px
- Sem bordas externas na tabela
- Separadores: border-bottom 1px solid border/50
- Cabeçalho: 11px semibold uppercase, sticky, bg-muted/50
- Linhas: altura 52px
- Hover: linear-gradient(90deg, primary/8%, transparent)
- Primeira coluna: text-foreground semibold
- Demais: text-muted-foreground
- Valores numéricos: font-mono (JetBrains Mono)

## Gráficos
- Container: bg-card, border-radius 16px, padding 24px
- Título: ícone Lucide 16px text-muted-foreground + texto 14px semibold text-foreground
- Subtítulo: 13px text-muted-foreground
- Barras: border-radius 4px topo
- Eixos: 11px font-mono text-muted-foreground
- Linhas de grade: border, 1px tracejado
- Tooltip: bg-popover, border-radius 8px, shadow
- Legenda: dot 8px + nome 11px, centralizada abaixo

## Tabs
- Container: bg-muted/50, border-radius 10px, padding 4px, borda 1px solid border/50
- Tab inativa: 14px medium text-muted-foreground, padding 8px 16px, border-radius 8px, hover bg-accent
- Tab ativa: 14px semibold text-foreground, bg-card, border-radius 8px, shadow-sm, borda 1px solid border
- Sem underline — padrão pill/card ativo

## Botões
- Primário: bg-primary, texto branco 14px semibold, border-radius 8px, hover scale(1.02) + glow
- Secundário: transparente, borda 1px solid border, texto foreground, hover bg-accent
- Active: scale(0.98)

## Modais
- Overlay: blur 4px + bg-background/60
- Container: bg-card, border-radius 20px, animação scale+fade
- Header: título 18px semibold + ícone, botão fechar top-right

## Badges
- Sem emojis — apenas ícones Lucide
- Fundo [cor] 12%, texto [cor], 10px semibold uppercase, border-radius 6px, padding 2px 8px

## Estados Vazios
- Ícone SVG/Lucide centralizado 48px text-muted-foreground/30
- Título: 16px semibold text-foreground
- Descrição: 14px text-muted-foreground
- Sem espaço em branco vazio

## Seções
- Título: 12px semibold uppercase letter-spacing 0.08em text-muted-foreground, ícone Lucide 14px à esquerda
- Separador: gradiente transparent → border/50 → transparent
- Subtítulo: 13px regular text-muted-foreground
- Espaçamento entre seções: 24px

## Tipografia
- Interface: Inter Variable (font-sans)
- Valores numéricos e monetários: JetBrains Mono (font-mono)
- Formato monetário: R$ XX.XXX (separador de milhar com ponto, sem centavos)

## Loading
- Shimmer em todos os componentes, NUNCA spinner
- KPIs: shimmer retangular no valor + label
- Tabela: shimmer em 5 linhas
- Gráfico: shimmer na área

## Animações
- Entrada: fadeInUp staggered 280ms, delay 40ms, easing cubic-bezier(0.16, 1, 0.3, 1)
- Hover cards: borda 150ms
- Botões: hover scale(1.02), active scale(0.98)
- Transição claro/escuro: transition all 300ms ease

## Scrollbar
- 4px, border-radius 4px, gradiente laranja→rosa

## Responsividade
- ≥ 1280px: grids normais
- < 1280px: KPIs 2x2, colunas empilhadas
- < 768px: tudo empilhado, tabela scroll horizontal

## Modo Claro/Escuro
- 100% CSS variables do design system, sem exceção
- Sem cores hardcoded

## Regra Absoluta
- ZERO emojis em qualquer lugar — apenas ícones Lucide
- ZERO spinners — apenas shimmer
- ZERO cores hardcoded — apenas CSS variables/Tailwind tokens
