# User Interface Design Goals

## Overall UX Vision

Dashboard analítico estilo "command center": navegação lateral por domínio (Visão Geral, PostHog, RevenueCat, Unificado, Configurações), filtros globais persistentes (data/segmento) e cards de métricas com drill-down. Clareza e velocidade de leitura acima de enfeites.

## Key Interaction Paradigms

- Filtros globais (período, segmento) aplicados a todas as visões.
- Drill-down ao clicar em números/gráficos.
- Cross-linking: de coorte de comportamento → receita correspondente.
- Estados de sync visíveis (última atualização, "sincronizar agora").

## Core Screens and Views

- Login
- Visão Geral (KPIs combinados)
- Dashboard PostHog (separado)
- Dashboard RevenueCat (separado)
- Dashboard Unificado (cruzamentos)
- Perfil de Usuário Unificado
- Configurações (credenciais, sync)

## Accessibility: WCAG AA

## Branding

Sem guia definido. Default: design system neutro/moderno (tema claro/escuro), tipografia legível para números, destaques para variações positivas/negativas. A definir com @ux-design-expert.

## Target Device and Platforms: Web Responsive

Desktop-first (uso analítico), responsivo para tablet/mobile.
