# Epic 2 — PostHog Integration

**Goal:** Conectar 100% da API relevante do PostHog (Cloud US), sincronizar os dados de forma incremental para o Postgres e entregar dashboards separados de produto, dando valor imediato mesmo antes da unificação.

**Status:** Planning · **Source PRD:** `docs/prd.md` · **Depends on:** Epic 1

---

## Story 2.1 PostHog API Client & Credentials

As a developer,
I want a server-side PostHog API client with configurable credentials,
so that we can query PostHog reliably and safely.

### Acceptance Criteria
1. Cliente PostHog server-side com base URL Cloud US e API key via env.
2. Tratamento de rate limit com retry/backoff exponencial.
3. Cobertura dos endpoints relevantes (events, persons, cohorts, insights/trends, funnels, retention).
4. Erros de API logados de forma estruturada.
5. Testes de integração (mockados) cobrem sucesso, rate limit e erro.

---

## Story 2.2 PostHog Incremental Sync Jobs

As a developer,
I want scheduled incremental sync of PostHog data into Postgres,
so that dashboards read fast from our own store.

### Acceptance Criteria
1. Job de sync agendado via Vercel Cron (frequência configurável, default horário).
2. Sync incremental usando cursor/checkpoint na tabela de controle.
3. Dados de PostHog persistidos em tabelas modeladas (events/persons/cohorts/insights).
4. Sync manual disparável; status/última atualização registrados.
5. Teste de integração valida idempotência e retomada por checkpoint.

---

## Story 2.3 PostHog Dashboards (Separate)

As a user,
I want dedicated PostHog dashboards,
so that I can analyze product behavior with better visuals than the native app.

### Acceptance Criteria
1. Visão com KPIs de produto (usuários ativos, eventos, retenção, funis).
2. Gráficos lendo do banco com filtro de período.
3. Drill-down em pelo menos uma métrica principal.
4. Carregamento < 2s para intervalos padrão.
5. Estado de sync (última atualização) visível na tela.
