# Lyrio Analytics Dashboard — Product Requirements Document (PRD)

> **Status:** Draft · **Version:** v1.0 · **Author:** Morgan (@pm) · **Date:** 2026-06-15
> **Pipeline:** @analyst (skipped) → **@pm (this doc)** → @architect → @sm (`*draft`) → @po → @dev → @qa → @devops

---

## Goals and Background Context

### Goals

- Entregar um dashboard web único que unifica os dados de produto (PostHog) e de receita/assinaturas (RevenueCat) em uma só experiência.
- Permitir análises **interligadas** (comportamento ↔ receita) e também **separadas** (visões dedicadas a cada plataforma) com profundidade maior que os apps nativos.
- Cobrir 100% das APIs relevantes do PostHog e do RevenueCat, persistindo os dados em banco próprio para joins reais e performance.
- Proteger o acesso com autenticação robusta (Auth.js), pronto para deploy front+back na Vercel.
- Oferecer visualizações superiores (funis, coortes, cruzamentos receita×comportamento) que respondam perguntas que nenhum dos dois apps responde isoladamente.

### Background Context

Hoje as métricas de produto vivem no PostHog e as de receita no RevenueCat, em silos. Responder perguntas como "qual coorte de comportamento converte melhor em assinatura?" ou "qual o LTV por funil de ativação?" exige exportações manuais e planilhas. Os apps nativos de cada ferramenta são bons isoladamente, mas não cruzam as duas fontes nem oferecem visualizações combinadas.

Este produto resolve isso criando uma camada de sincronização que ingere ambas as APIs para um banco Postgres próprio, une as identidades pelo identificador compartilhado (`distinct_id` do PostHog ↔ `app_user_id` do RevenueCat) e expõe dashboards unificados e separados em uma aplicação Next.js implantada na Vercel.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-06-15 | v1.0 | Criação inicial do PRD a partir da visão do stakeholder | Morgan (@pm) |

---

## Requirements

### Functional

- **FR1:** O sistema deve permitir login e logout via Auth.js (NextAuth), suportando ao menos um provedor OAuth (Google) e/ou e-mail.
- **FR2:** Todas as rotas do dashboard devem ser protegidas; usuários não autenticados são redirecionados para a tela de login.
- **FR3:** O sistema deve gerenciar sessões de forma segura (cookies httpOnly, expiração configurável).
- **FR4:** O sistema deve conectar-se à API do PostHog (Cloud US) usando credencial configurável e ingerir a amplitude de dados relevante: eventos, insights/trends, funis, retenção, persons, cohorts.
- **FR5:** Jobs de sincronização agendados devem persistir os dados do PostHog em banco Postgres, de forma incremental.
- **FR6:** O sistema deve conectar-se à API do RevenueCat e ingerir subscribers, entitlements, transações e métricas de receita (MRR, assinaturas ativas, churn, trials, conversões).
- **FR7:** Jobs de sincronização agendados devem persistir os dados do RevenueCat em banco Postgres, de forma incremental.
- **FR8:** O sistema deve unir um usuário do PostHog a um assinante do RevenueCat pela chave compartilhada (`distinct_id` ↔ `app_user_id`), mantendo um modelo de identidade unificado.
- **FR9:** O sistema deve oferecer um perfil de usuário unificado combinando comportamento (PostHog) e receita (RevenueCat).
- **FR10:** O sistema deve oferecer dashboards **separados** do PostHog (métricas de produto).
- **FR11:** O sistema deve oferecer dashboards **separados** do RevenueCat (métricas de receita).
- **FR12:** O sistema deve oferecer dashboards **unificados** cruzando as duas fontes (ex.: receita por coorte de comportamento, funil de ativação→assinatura, LTV por canal/feature).
- **FR13:** Todos os dashboards devem suportar filtro por intervalo de datas e segmentação básica.
- **FR14:** As visualizações devem incluir, no mínimo, séries temporais, barras, funis e mapas de calor de coorte, com qualidade superior à dos apps nativos.
- **FR15:** O sistema deve permitir disparar sincronização manual e exibir o status/última atualização de cada fonte.
- **FR16:** O sistema deve oferecer uma área de configuração para gerenciar credenciais de API de forma segura (server-side).

### Non Functional

- **NFR1:** Front-end e back-end devem rodar na Vercel (App Router + route handlers + Vercel Cron para sync).
- **NFR2:** Segredos e chaves de API devem residir em variáveis de ambiente, nunca expostos ao cliente.
- **NFR3:** Toda chamada às APIs do PostHog/RevenueCat deve ocorrer server-side.
- **NFR4:** O sistema deve respeitar os rate limits das APIs externas, com retry/backoff exponencial.
- **NFR5:** O carregamento inicial dos dashboards deve ler do banco e responder em < 2s para intervalos padrão.
- **NFR6:** A frequência de sincronização deve ser configurável (default: de hora em hora).
- **NFR7:** Código em TypeScript, com testes unitários + de integração nos pontos críticos (sync, identity mapping, auth).
- **NFR8:** Interface web responsiva, atendendo acessibilidade WCAG AA.
- **NFR9:** A sincronização deve ser incremental (cursor/checkpoint), evitando reprocessar todo o histórico a cada execução.
- **NFR10:** O sistema deve registrar erros de sync e expor observabilidade mínima (logs estruturados, status de jobs).

---

## User Interface Design Goals

### Overall UX Vision

Um dashboard analítico limpo, denso em informação porém legível, no estilo "command center" — navegação lateral por domínio (Visão Geral, PostHog, RevenueCat, Unificado, Configurações), filtros globais persistentes (data/segmento) e cards de métricas com drill-down. Prioriza clareza e velocidade de leitura sobre enfeites.

### Key Interaction Paradigms

- Filtros globais (período, segmento) que se aplicam a todas as visões.
- Drill-down: clicar em um número/gráfico abre o detalhamento.
- Cross-linking: de uma coorte de comportamento, navegar direto à receita correspondente.
- Estados de sync visíveis (última atualização, "sincronizar agora").

### Core Screens and Views

- Tela de Login
- Visão Geral (KPIs combinados)
- Dashboard PostHog (separado)
- Dashboard RevenueCat (separado)
- Dashboard Unificado (cruzamentos)
- Perfil de Usuário Unificado (comportamento + receita)
- Configurações (credenciais, sync)

### Accessibility: WCAG AA

### Branding

Sem guia de marca definido ainda. Default: design system neutro e moderno (tema claro/escuro), tipografia legível para números, paleta sóbria com destaques para variações positivas/negativas. A definir com @ux-design-expert.

### Target Device and Platforms: Web Responsive

Desktop-first (uso analítico), responsivo para tablet/mobile.

---

## Technical Assumptions

> Decisões tomadas com o stakeholder em 2026-06-15. São **constraints** para o @architect.

### Repository Structure: Monorepo

Aplicação Next.js full-stack única (front + back no mesmo projeto), facilitando deploy unificado na Vercel.

### Service Architecture

**Serverless dentro do Next.js (App Router).** Route handlers para a API interna; **Vercel Cron** para disparar os jobs de sincronização. Camada de dados em **Postgres** (provider a definir pelo @architect — ex.: Vercel Postgres/Neon/Supabase), com sync incremental armazenando dados de PostHog e RevenueCat.

### Testing Requirements

**Unit + Integration.** Prioridade de cobertura: lógica de sync, identity mapping (join PostHog↔RevenueCat), camada de auth e transformações de métricas. E2E pode ser adicionado em epic posterior.

### Additional Technical Assumptions and Requests

- **Auth:** Auth.js (NextAuth) — decisão fechada.
- **PostHog:** Cloud US (base URL US) — decisão fechada.
- **Estratégia de dados:** sync + banco próprio (não pass-through) — decisão fechada.
- **Chave de identidade:** `distinct_id` (PostHog) ↔ `app_user_id` (RevenueCat) — decisão fechada.
- ORM/queries (Prisma vs Drizzle) e provider Postgres: **a definir pelo @architect**.
- Biblioteca de gráficos (Recharts/visx/Tremor): **a definir pelo @architect/@ux**.
- Estratégia de cache/revalidação para leituras de dashboard: **a definir pelo @architect**.

---

## Epic List

1. **Epic 1 — Foundation & Auth:** Estabelecer o projeto Next.js (monorepo), autenticação Auth.js, banco Postgres, CI/CD e deploy na Vercel, entregando um dashboard "shell" protegido e uma rota de health-check.
2. **Epic 2 — PostHog Integration:** Conectar 100% da API do PostHog, sincronizar dados para o banco e entregar os dashboards **separados** de produto.
3. **Epic 3 — RevenueCat Integration:** Conectar 100% da API do RevenueCat, sincronizar dados para o banco e entregar os dashboards **separados** de receita.
4. **Epic 4 — Unified Analytics (Identity Mapping):** Unir as identidades (`distinct_id` ↔ `app_user_id`), modelar dados unificados e entregar perfis e cruzamentos comportamento×receita.
5. **Epic 5 — Advanced Dashboards & Visualizations:** Visualizações superiores (funis, coortes, heatmaps), filtros/segmentação avançados e refinamento de UX acima dos apps nativos.

---

## Epic 1 — Foundation & Auth

**Goal:** Estabelecer toda a fundação técnica do produto — projeto Next.js, autenticação, banco de dados, CI/CD e deploy na Vercel — entregando já um incremento implantável: um dashboard "shell" protegido por login e uma rota de health-check verificável em produção.

### Story 1.1 Project Scaffolding & Health Check
As a developer,
I want a Next.js (App Router, TypeScript) project scaffolded and deployable to Vercel,
so that we have a verified foundation to build on.

#### Acceptance Criteria
1: Projeto Next.js (App Router + TypeScript) criado na raiz do repositório, com lint e typecheck configurados.
2: Rota `/api/health` retorna `200` com status do app e timestamp.
3: Página inicial pública renderiza um "canary" simples confirmando o build.
4: Deploy na Vercel funcional; a rota de health responde em produção.
5: README com instruções de setup local e variáveis de ambiente necessárias.

### Story 1.2 Database Setup & Schema Baseline
As a developer,
I want a Postgres database connected with a baseline schema and migrations,
so that we can persist synced data reliably.

#### Acceptance Criteria
1: Conexão Postgres configurada via env var, server-side apenas.
2: Ferramenta de migração configurada (ORM a definir pelo @architect).
3: Migração inicial cria tabelas-base e tabela de controle de sync (cursores/checkpoints).
4: Script de migração roda em ambiente local e em produção (Vercel).
5: Teste de integração valida conexão e execução de uma query simples.

### Story 1.3 Authentication with Auth.js
As a user,
I want to log in and out securely,
so that only authorized people access the dashboard.

#### Acceptance Criteria
1: Auth.js (NextAuth) configurado com ao menos um provedor (Google e/ou e-mail).
2: Sessão persistida com cookie httpOnly e expiração configurável.
3: Login bem-sucedido redireciona ao dashboard; logout encerra a sessão.
4: Credenciais/segredos em env vars, nunca expostos ao cliente.
5: Testes cobrem fluxo de login, logout e expiração de sessão.

### Story 1.4 Protected App Shell & Navigation
As a user,
I want a protected dashboard shell with navigation,
so that I have a consistent place to access all analytics views.

#### Acceptance Criteria
1: Middleware/guard redireciona usuários não autenticados para `/login`.
2: Layout com navegação lateral (Visão Geral, PostHog, RevenueCat, Unificado, Configurações) — telas ainda podem ser placeholders.
3: Filtro global de período presente no layout (sem dados reais ainda).
4: Layout responsivo e acessível (WCAG AA básico).
5: Deploy na Vercel com o shell protegido funcionando em produção.

---

## Epic 2 — PostHog Integration

**Goal:** Conectar 100% da API relevante do PostHog (Cloud US), sincronizar os dados de forma incremental para o Postgres e entregar dashboards separados de produto, dando valor imediato mesmo antes da unificação.

### Story 2.1 PostHog API Client & Credentials
As a developer,
I want a server-side PostHog API client with configurable credentials,
so that we can query PostHog reliably and safely.

#### Acceptance Criteria
1: Cliente PostHog server-side com base URL Cloud US e API key via env.
2: Tratamento de rate limit com retry/backoff exponencial.
3: Cobertura dos endpoints relevantes (events, persons, cohorts, insights/trends, funnels, retention).
4: Erros de API logados de forma estruturada.
5: Testes de integração (mockados) cobrem sucesso, rate limit e erro.

### Story 2.2 PostHog Incremental Sync Jobs
As a developer,
I want scheduled incremental sync of PostHog data into Postgres,
so that dashboards read fast from our own store.

#### Acceptance Criteria
1: Job de sync agendado via Vercel Cron (frequência configurável, default horário).
2: Sync incremental usando cursor/checkpoint na tabela de controle.
3: Dados de PostHog persistidos em tabelas modeladas (events/persons/cohorts/insights).
4: Sync manual disparável; status/última atualização registrados.
5: Teste de integração valida idempotência e retomada por checkpoint.

### Story 2.3 PostHog Dashboards (Separate)
As a user,
I want dedicated PostHog dashboards,
so that I can analyze product behavior with better visuals than the native app.

#### Acceptance Criteria
1: Visão com KPIs de produto (usuários ativos, eventos, retenção, funis).
2: Gráficos lendo do banco com filtro de período.
3: Drill-down em pelo menos uma métrica principal.
4: Carregamento < 2s para intervalos padrão.
5: Estado de sync (última atualização) visível na tela.

---

## Epic 3 — RevenueCat Integration

**Goal:** Conectar 100% da API relevante do RevenueCat, sincronizar receita/assinaturas de forma incremental para o Postgres e entregar dashboards separados de receita.

### Story 3.1 RevenueCat API Client & Credentials
As a developer,
I want a server-side RevenueCat API client with configurable credentials,
so that we can query subscription and revenue data safely.

#### Acceptance Criteria
1: Cliente RevenueCat server-side com API key via env.
2: Tratamento de rate limit com retry/backoff.
3: Cobertura dos dados relevantes (subscribers, entitlements, transactions, métricas de receita).
4: Erros logados de forma estruturada.
5: Testes de integração (mockados) cobrem sucesso, rate limit e erro.

### Story 3.2 RevenueCat Incremental Sync Jobs
As a developer,
I want scheduled incremental sync of RevenueCat data into Postgres,
so that revenue dashboards read fast from our own store.

#### Acceptance Criteria
1: Job de sync agendado via Vercel Cron (frequência configurável).
2: Sync incremental com cursor/checkpoint.
3: Dados persistidos em tabelas modeladas (subscribers/transactions/entitlements).
4: Sync manual disparável; status/última atualização registrados.
5: Teste de integração valida idempotência e retomada.

### Story 3.3 RevenueCat Dashboards (Separate)
As a user,
I want dedicated RevenueCat dashboards,
so that I can analyze revenue with better visuals than the native app.

#### Acceptance Criteria
1: Visão com KPIs de receita (MRR, assinaturas ativas, churn, trials, conversão).
2: Gráficos lendo do banco com filtro de período.
3: Drill-down em pelo menos uma métrica principal.
4: Carregamento < 2s para intervalos padrão.
5: Estado de sync (última atualização) visível na tela.

---

## Epic 4 — Unified Analytics (Identity Mapping)

**Goal:** Unir as duas fontes pelo identificador compartilhado (`distinct_id` ↔ `app_user_id`), criar o modelo de dados unificado e entregar perfis de usuário e cruzamentos comportamento×receita — o diferencial central do produto.

### Story 4.1 Identity Mapping (distinct_id ↔ app_user_id)
As a developer,
I want PostHog persons joined to RevenueCat subscribers by the shared id,
so that we can analyze behavior and revenue together.

#### Acceptance Criteria
1: Lógica de mapeamento liga `distinct_id` (PostHog) a `app_user_id` (RevenueCat).
2: Modelo de identidade unificado persistido (tabela/views de junção).
3: Tratamento de casos sem correspondência (somente PostHog ou somente RevenueCat).
4: Métrica de cobertura do match exposta (quantos % cruzaram).
5: Testes cobrem match, no-match e duplicidades.

### Story 4.2 Unified User Profile
As a user,
I want a unified profile combining a user's behavior and revenue,
so that I understand the full picture per user.

#### Acceptance Criteria
1: Tela de perfil mostra eventos/comportamento (PostHog) + assinatura/receita (RevenueCat).
2: Busca/seleção de usuário por id ou e-mail.
3: Indicação clara quando uma das fontes não tem dados para o usuário.
4: Carregamento < 2s.
5: Testes de integração para a montagem do perfil unificado.

### Story 4.3 Cross-Platform Insights
As a user,
I want combined insights (revenue × behavior),
so that I can answer questions neither app answers alone.

#### Acceptance Criteria
1: Pelo menos 3 cruzamentos: receita por coorte de comportamento, funil ativação→assinatura, LTV por feature/canal.
2: Filtro de período e segmentação aplicáveis.
3: Visualizações dedicadas (ex.: heatmap de coorte, funil).
4: Leitura do banco em < 2s para intervalos padrão.
5: Testes validam os cálculos dos cruzamentos.

---

## Epic 5 — Advanced Dashboards & Visualizations

**Goal:** Elevar a qualidade das visualizações e da UX acima dos apps nativos — funis interativos, coortes, heatmaps, segmentação avançada e refinamentos de performance/usabilidade.

### Story 5.1 Advanced Visualization Library
As a user,
I want richer interactive charts,
so that analysis is clearer and faster than native apps.

#### Acceptance Criteria
1: Biblioteca de gráficos selecionada e padronizada (funil, coorte/heatmap, séries, barras).
2: Componentes reutilizáveis com tema claro/escuro.
3: Interações: hover/tooltip, zoom/seleção de período no gráfico.
4: Acessibilidade WCAG AA nos componentes de gráfico.
5: Testes de componente para os gráficos principais.

### Story 5.2 Advanced Segmentation & Filters
As a user,
I want advanced segmentation and global filters,
so that I can slice all dashboards consistently.

#### Acceptance Criteria
1: Filtros globais (período + segmentos) persistem entre telas.
2: Segmentação por atributos combinados (comportamento + plano/assinatura).
3: Estados de filtro refletidos na URL (compartilhável).
4: Performance mantida (< 2s) com filtros aplicados.
5: Testes cobrem persistência e aplicação dos filtros.

### Story 5.3 Overview Command Center
As a user,
I want a combined overview screen,
so that I see the most important unified KPIs at a glance.

#### Acceptance Criteria
1: Tela "Visão Geral" com KPIs combinados (produto + receita + cruzamentos-chave).
2: Cards com variação vs. período anterior.
3: Links de drill-down para as visões específicas.
4: Layout responsivo e acessível.
5: Carregamento < 2s.

---

## Checklist Results Report

> A executar via `*execute-checklist pm-checklist` após validação do stakeholder. Pendente.

---

## Next Steps

### UX Expert Prompt

@ux-design-expert: Use este PRD para criar o front-end spec do Lyrio Analytics Dashboard — foco em command center analítico (navegação por domínio, filtros globais, drill-down), tema claro/escuro, WCAG AA, e visualizações (funil, coorte/heatmap, séries) superiores aos apps nativos do PostHog/RevenueCat.

### Architect Prompt

@architect: Use este PRD para desenhar a arquitetura full-stack na Vercel (Next.js App Router + route handlers + Vercel Cron). Decisões abertas a fechar: provider Postgres, ORM (Prisma/Drizzle), estratégia de sync incremental, modelo de identidade (`distinct_id`↔`app_user_id`), camada de cache/revalidação e biblioteca de gráficos. Constraints fechadas: Auth.js, PostHog Cloud US, sync+banco próprio, monorepo serverless, testes unit+integration.
