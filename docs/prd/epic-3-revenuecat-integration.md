# Epic 3 — RevenueCat Integration

**Goal:** Conectar 100% da API relevante do RevenueCat, sincronizar receita/assinaturas de forma incremental para o Postgres e entregar dashboards separados de receita.

**Status:** Planning · **Source PRD:** `docs/prd.md` · **Depends on:** Epic 1

---

## Story 3.1 RevenueCat API Client & Credentials

As a developer,
I want a server-side RevenueCat API client with configurable credentials,
so that we can query subscription and revenue data safely.

### Acceptance Criteria
1. Cliente RevenueCat server-side com API key via env.
2. Tratamento de rate limit com retry/backoff.
3. Cobertura dos dados relevantes (subscribers, entitlements, transactions, métricas de receita).
4. Erros logados de forma estruturada.
5. Testes de integração (mockados) cobrem sucesso, rate limit e erro.

---

## Story 3.2 RevenueCat Incremental Sync Jobs

As a developer,
I want scheduled incremental sync of RevenueCat data into Postgres,
so that revenue dashboards read fast from our own store.

### Acceptance Criteria
1. Job de sync agendado via Vercel Cron (frequência configurável).
2. Sync incremental com cursor/checkpoint.
3. Dados persistidos em tabelas modeladas (subscribers/transactions/entitlements).
4. Sync manual disparável; status/última atualização registrados.
5. Teste de integração valida idempotência e retomada.

---

## Story 3.3 RevenueCat Dashboards (Separate)

As a user,
I want dedicated RevenueCat dashboards,
so that I can analyze revenue with better visuals than the native app.

### Acceptance Criteria
1. Visão com KPIs de receita (MRR, assinaturas ativas, churn, trials, conversão).
2. Gráficos lendo do banco com filtro de período.
3. Drill-down em pelo menos uma métrica principal.
4. Carregamento < 2s para intervalos padrão.
5. Estado de sync (última atualização) visível na tela.
