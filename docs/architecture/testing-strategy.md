# Testing Strategy

**Scope (PRD NFR7):** Unit + Integration. E2E deferred to a later epic.

## Unit (Vitest)

- Identity resolution (`distinct_id`↔`app_user_id`, no-match, duplicates).
- Metric transforms (MRR, churn, retention, funnel math).
- Cursor/checkpoint logic.
- Zod schema parsing of API payloads.
- `withRetry` backoff behavior.

## Integration (Vitest + disposable test DB)

- **Sync idempotency & resume:** running a sync twice produces no duplicates; resumes from checkpoint.
- **Auth flow:** login, logout, session expiry, protected-route redirect.
- **Unified profile assembly:** profile combines both sources; handles missing source.
- **DB connectivity & migrations:** baseline migration applies; simple query works (Story 1.2 AC5).

## Rules

- No real network in tests — mock PostHog/RevenueCat clients.
- Integration tests use an isolated test database, reset between runs.
- Critical paths (sync, identity, auth) must have tests before story is marked done.

## CI

- `lint` + `typecheck` + `test` run on every push (pipeline owned by @devops).
