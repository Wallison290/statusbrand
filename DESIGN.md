---
version: alpha
name: StatusMedia
description: Sistema de gestão de conteúdo e planejamento para agências e criadores. Interface minimalista, profissional, com tema escuro profundo e acento azul (#2563EB).

colors:
  background: "#050816"
  background-general: "#0B1020"
  background-secondary: "#101A2B"
  card: "#182233"
  foreground: "#F8FAFC"
  foreground-muted: "#CBD5E1"
  border: "#1e293b"
  border-subtle: "#182233"
  accent-primary: "#2563EB"
  accent-primary-hover: "#1D4ED8"
  accent-primary-dark: "#1E40AF"
  accent-primary-glow: "#60A5FA"
  accent-purple: "#8B5CF6"
  accent-blue: "#4F8EF7"
  accent-orange: "#F5A623"
  sidebar-bg: "#050816"
  sidebar-border: "#101A2B"
  sidebar-text: "#CBD5E1"
  sidebar-text-muted: "#64748b"
  destructive: "#ef4444"
  success: "#22C55E"
  warning: "#F5A623"
  chart-primary: "#2563EB"
  chart-grid: "#182233"
  chart-axis: "#CBD5E1"
  status-active: "#22C55E"
  status-published: "#4ADE80"
  status-production: "#4F8EF7"
  status-review: "#F5A623"
  status-rejected: "#f87171"
  status-idea: "#8B5CF6"
  instagram-start: "#E1306C"
  instagram-end: "#833AB4"

typography:
  page-title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  small:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  label:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
  badge:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.2
  micro:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: 10px
    fontWeight: 700
    lineHeight: 1.2

rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 20px
  xl: 24px
  2xl: 32px

components:
  card:
    backgroundColor: "{colors.surface}"
    rounded: lg
    padding: lg
  card-dark:
    backgroundColor: "#0d0f14"
    rounded: lg
    padding: lg
  button-primary:
    backgroundColor: "#2563eb"
    textColor: "{colors.primary-foreground}"
    rounded: md
    height: 32px
  button-primary-hover:
    backgroundColor: "#3b82f6"
    textColor: "{colors.primary-foreground}"
  button-destructive:
    backgroundColor: "rgba(239,68,68,0.1)"
    textColor: "{colors.destructive}"
    rounded: md
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-muted}"
    rounded: md
  sidebar:
    backgroundColor: "{colors.sidebar-bg}"
    textColor: "{colors.sidebar-text}"
    width: 220px
  sidebar-item:
    backgroundColor: "transparent"
    textColor: "{colors.sidebar-text}"
    rounded: xl
    padding: sm
  sidebar-item-active:
    backgroundColor: "linear-gradient(135deg, {colors.accent-violet} 0%, {colors.accent-indigo} 100%)"
    textColor: "{colors.primary-foreground}"
    rounded: xl
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: lg
    height: 32px
  badge:
    backgroundColor: "{colors.surface-secondary}"
    textColor: "{colors.foreground-muted}"
    rounded: full
    padding: xs
  badge-status-active:
    backgroundColor: "rgba(74,222,128,0.1)"
    textColor: "{colors.status-active}"
    rounded: full
  badge-status-production:
    backgroundColor: "rgba(96,165,250,0.1)"
    textColor: "{colors.status-production}"
    rounded: full
  badge-status-review:
    backgroundColor: "rgba(250,204,21,0.1)"
    textColor: "{colors.status-review}"
    rounded: full
  badge-status-rejected:
    backgroundColor: "rgba(248,113,113,0.1)"
    textColor: "{colors.status-rejected}"
    rounded: full
  progress-bar:
    backgroundColor: "linear-gradient(135deg, {colors.accent-violet} 0%, {colors.accent-indigo} 100%)"
    rounded: full
    height: 4px
  progress-bar-warning:
    backgroundColor: "{colors.warning}"
    rounded: full
  progress-bar-danger:
    backgroundColor: "{colors.destructive}"
    rounded: full
---

## Overview

StatusMedia é um sistema SaaS de gestão de conteúdo para agências e criadores de conteúdo. A interface combina minimalismo profissional com acentos de violeta e índigo, criando uma experiência séria mas não austere. O padrão visual segue a filosofia de um **dashboard analítico de alto desempenho**: informação densa, hierarquia clara, sem ornamentos desnecessários.

Referência estética: interface administrativa moderna no estilo Linear, Vercel Dashboard e Notion — mas com a paleta de violeta/índigo como identidade própria.

## Colors

O sistema usa um **tema claro como base** com a sidebar em dark (#0b0e1a), criando contraste deliberado entre a navegação e o conteúdo. Isso guia o olho do usuário do menu para o conteúdo principal.

O **violeta (#7c3aed) e índigo (#4f46e5)** são as únicas cores de marca presentes na interface. Eles aparecem exclusivamente em: item ativo da sidebar, barra de progresso de IA, o módulo "IA Copilot" e CTAs de destaque. Não os use em elementos secundários.

**Cores de status** seguem semântica universal: verde = ativo/publicado, azul = em produção, amarelo = em revisão, vermelho = reprovado/urgente, roxo = ideia. Sempre aplique com 10% de opacidade no background e borda de 20% de opacidade para manter a leveza.

Nunca use gradientes fora da sidebar ativa e da barra de progresso de IA. O restante da interface é flat.

## Typography

**Inter** é a única fonte do sistema. Toda a tipografia usa tamanhos pequenos (10px–13px), reforçando a densidade informacional do produto. Isso não é acidente — usuários de ferramentas de gestão preferem ver mais conteúdo por tela.

Use **font-weight 600** apenas para títulos de página e seção. O restante é 400 (normal) ou 500 (label). Nunca use bold (700) fora de badges micro.

Font features ativadas: `cv02`, `cv03`, `cv04`, `cv11` — aplicadas via CSS global no `index.css`.

## Layout

Estrutura fixa: sidebar lateral esquerda (220px expandida / 56px colapsada) + conteúdo principal com header fixo de 56px.

O grid de conteúdo usa **padding horizontal de 32px** em desktop. Em mobile, a sidebar vira overlay e desaparece, com um header fixo de 48px substituindo a navegação.

Nunca adicione sombras pesadas. Profundidade é criada apenas com bordas sutis (1px solid #e8e8e8) e variação de cor de fundo entre surface (#fff) e background (#f7f7f7).

## Elevation & Depth

Sem box-shadow expressiva. A hierarquia visual é criada por:
1. Cor de fundo: `#f7f7f7` (página) vs `#ffffff` (card)
2. Bordas: `1px solid #e8e8e8`
3. Opacidade: sobreposições usam `rgba` com baixa opacidade

A única exceção é o Dialog/Modal, que usa `shadow-2xl` para destacar o overlay.

## Shapes

Border-radius segue escala consistente:
- **4px (sm)**: elementos micro (badges pequenos)
- **6px (md)**: inputs, dropdowns
- **8px (lg)**: cards, botões padrão
- **12px (xl)**: itens de navegação, asset cards
- **16px (2xl)**: modais, dialogs
- **9999px (full)**: pills, avatares, barras de progresso

Nunca misture raios muito diferentes dentro de um mesmo componente composto.

## Components

**Sidebar**: Dark (#0b0e1a), largura colapsável. Item ativo usa gradiente violeta→índigo. Hover em cinza escuro sutil. Inclui métricas de uso (IA e storage) com barras de progresso que mudam de cor: violeta (normal) → âmbar (≥70%) → vermelho (≥90%).

**Card**: Fundo branco, borda sutil, padding 20px. Header com título 13px/500 e descrição 12px/400 em `text-zinc-500`. Sem sombra.

**Button**: Altura 32px (padrão), 28px (sm), 36px (lg). Gap de 6px entre ícone e texto. Variante primária é azul (#2563eb), não violeta — violeta é reservado para identidade de marca e IA.

**Badge de status**: Sempre com fundo colorido em 10% de opacidade, borda em 20%, texto na cor plena. Nunca badge sólido para status.

**Inputs**: Altura 32px, fundo branco, borda #e3e3e3. Focus com ring de 1px em #707070/40.

**Gráficos**: Barras em #0f172a (slate escuro), grid em #eef2f7, eixos em #94a3b8 tamanho 11px. Tooltip com fundo branco, borda #f1f5f9, border-radius 10px.

## Do's and Don'ts

**Faça:**
- Use violeta/índigo apenas para elementos de marca e IA
- Mantenha tipografia compacta (13px máximo para body)
- Aplique animações com Framer Motion usando spring (stiffness 420, damping 26)
- Use cores de status com opacidade 10% de fundo
- Mantenha sidebar sempre dark, mesmo no tema claro

**Não faça:**
- Não use gradientes fora da sidebar ativa e barra de progresso de IA
- Não use box-shadow fora de modais
- Não use font-size maior que 13px no conteúdo principal
- Não use cores de marca (violeta/índigo) em botões de ação comum
- Não misture border-radius muito diferentes dentro de um mesmo componente
