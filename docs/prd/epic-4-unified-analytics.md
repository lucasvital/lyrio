# Epic 4 — Unified Analytics (Identity Mapping)

**Goal:** Unir as duas fontes pelo identificador compartilhado (`distinct_id` ↔ `app_user_id`), criar o modelo de dados unificado e entregar perfis de usuário e cruzamentos comportamento×receita — o diferencial central do produto.

**Status:** Planning · **Source PRD:** `docs/prd.md` · **Depends on:** Epics 2 e 3

---

## Story 4.1 Identity Mapping (distinct_id ↔ app_user_id)

As a developer,
I want PostHog persons joined to RevenueCat subscribers by the shared id,
so that we can analyze behavior and revenue together.

### Acceptance Criteria
1. Lógica de mapeamento liga `distinct_id` (PostHog) a `app_user_id` (RevenueCat).
2. Modelo de identidade unificado persistido (tabela/views de junção).
3. Tratamento de casos sem correspondência (somente PostHog ou somente RevenueCat).
4. Métrica de cobertura do match exposta (quantos % cruzaram).
5. Testes cobrem match, no-match e duplicidades.

---

## Story 4.2 Unified User Profile

As a user,
I want a unified profile combining a user's behavior and revenue,
so that I understand the full picture per user.

### Acceptance Criteria
1. Tela de perfil mostra eventos/comportamento (PostHog) + assinatura/receita (RevenueCat).
2. Busca/seleção de usuário por id ou e-mail.
3. Indicação clara quando uma das fontes não tem dados para o usuário.
4. Carregamento < 2s.
5. Testes de integração para a montagem do perfil unificado.

---

## Story 4.3 Cross-Platform Insights

As a user,
I want combined insights (revenue × behavior),
so that I can answer questions neither app answers alone.

### Acceptance Criteria
1. Pelo menos 3 cruzamentos: receita por coorte de comportamento, funil ativação→assinatura, LTV por feature/canal.
2. Filtro de período e segmentação aplicáveis.
3. Visualizações dedicadas (ex.: heatmap de coorte, funil).
4. Leitura do banco em < 2s para intervalos padrão.
5. Testes validam os cálculos dos cruzamentos.
