# Goals and Background Context

## Goals

- Entregar um dashboard web único que unifica os dados de produto (PostHog) e de receita/assinaturas (RevenueCat).
- Permitir análises **interligadas** (comportamento ↔ receita) e também **separadas**, com profundidade maior que os apps nativos.
- Cobrir 100% das APIs relevantes do PostHog e do RevenueCat, persistindo os dados em banco próprio para joins reais e performance.
- Proteger o acesso com autenticação robusta (Auth.js), pronto para deploy front+back na Vercel.
- Oferecer visualizações superiores (funis, coortes, cruzamentos receita×comportamento).

## Background Context

Hoje as métricas de produto vivem no PostHog e as de receita no RevenueCat, em silos. Responder perguntas como "qual coorte de comportamento converte melhor em assinatura?" exige exportações manuais. Os apps nativos não cruzam as duas fontes nem oferecem visualizações combinadas.

Este produto cria uma camada de sincronização que ingere ambas as APIs para um Postgres próprio, une as identidades pelo identificador compartilhado (`distinct_id` ↔ `app_user_id`) e expõe dashboards unificados e separados em uma aplicação Next.js na Vercel.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-15 | v1.0 | Criação inicial | Morgan (@pm) |
