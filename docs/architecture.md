# Lyrio Analytics Dashboard — Fullstack Architecture

> **Status:** Draft · **Version:** v1.0 · **Author:** Aria (@architect) · **Date:** 2026-06-15
> **Source PRD:** `docs/prd.md` · **Sharded:** `docs/architecture/`

## 1. Introduction

Arquitetura full-stack para um dashboard analítico que unifica PostHog (produto) e RevenueCat (receita). A aplicação é um monorepo Next.js (App Router) implantado na Vercel, com sincronização incremental das duas APIs para um Postgres próprio (Neon), unificação de identidade via `distinct_id`↔`app_user_id` e visualizações superiores aos apps nativos.

### Architectural Drivers (do PRD)

- **NFR1:** front+back na Vercel (serverless + Vercel Cron).
- **NFR5:** dashboards < 2s lendo do banco.
- **NFR9:** sync incremental (cursor/checkpoint).
- **FR8:** join PostHog↔RevenueCat por id compartilhado.
- **NFR2/NFR3:** segredos server-side, chamadas externas server-side.

## 2. High-Level Architecture

```
                ┌─────────────────────────── Vercel ───────────────────────────┐
  Browser  ───► │  Next.js App Router (RSC + Route Handlers)                     │
  (Auth.js)     │   ├─ /(dashboard)  RSC pages → read DB (Drizzle)              │
                │   ├─ /api/auth/*   Auth.js (NextAuth v5)                       │
                │   ├─ /api/sync/posthog     (POST, CRON_SECRET)                 │
                │   └─ /api/sync/revenuecat  (POST, CRON_SECRET)                 │
                │                                                                │
                │  Vercel Cron ──(hourly)──► /api/sync/*                         │
                └───────────────┬──────────────────────────┬───────────────────┘
                                │ Drizzle                    │ server-side fetch
                                ▼                            ▼
                        ┌──────────────┐          ┌─────────────────────────┐
                        │ Neon Postgres│          │ PostHog API (Cloud US)  │
                        │  raw + marts │          │ RevenueCat API          │
                        └──────────────┘          └─────────────────────────┘
```

### Pattern Summary

- **Serverless monolith** (single Next.js app, no separate backend service).
- **Read path:** React Server Components read directly from Postgres via Drizzle (fast, cached with `revalidateTag`).
- **Write/ingest path:** Vercel Cron triggers protected route handlers that pull from the external APIs incrementally and upsert into Postgres.
- **ELT, not ETL:** ingest raw → transform into analytics marts (views/materialized views) → dashboards read marts.

## 3. Tech Stack

See [`docs/architecture/tech-stack.md`](./architecture/tech-stack.md) (canonical). Summary: Next.js 15 (App Router) · React 19 · TypeScript · Auth.js v5 · Neon Postgres · Drizzle ORM · Tailwind + shadcn/ui + Tremor/Recharts · Zod · Vitest · Vercel + Vercel Cron.

## 4. Components

- **Auth module** — Auth.js v5, Google OAuth + email; session via httpOnly cookie; middleware guard.
- **DB layer** — Drizzle schema + `drizzle-kit` migrations; connection via Neon serverless driver.
- **Ingestion layer** — `lib/sync/posthog`, `lib/sync/revenuecat`: API clients (retry/backoff), incremental fetch by cursor, idempotent upserts, `sync_state` checkpoints.
- **Identity layer** — `lib/identity`: resolves `distinct_id`↔`app_user_id` into `app_user`; powers `unified_user`.
- **Analytics/marts** — SQL views/materialized views for separate + unified dashboards.
- **UI layer** — RSC dashboard pages, Tremor/Recharts charts, global period/segment filters (URL state).

## 5. Cross-Cutting Concerns

- **Security:** all external calls server-side; secrets in Vercel env vars; `CRON_SECRET` guards sync endpoints; Auth.js protects routes; Zod validates env + API payloads.
- **Caching:** RSC reads wrapped in `unstable_cache` tagged `posthog`/`revenuecat`/`unified`; sync jobs call `revalidateTag` on completion → fresh dashboards, < 2s reads.
- **Observability:** structured logs (pino), `sync_state` row per source (last run, status, error), Vercel logs/metrics.
- **Error handling:** typed Result/throw at boundaries; retry/backoff on 429/5xx from external APIs; partial-failure isolation per source.

## 6. Open Decisions Closed

| Decision | Resolution | Alternatives (override possible) |
|---|---|---|
| Postgres provider | Neon | Vercel Postgres (Neon-backed), Supabase |
| ORM | Drizzle | Prisma |
| Sync trigger | Vercel Cron → route handlers | Inngest/Trigger.dev (if workflows grow) |
| Identity model | `app_user` + `unified_user` view | mapping table (deferred unless ids diverge) |
| Cache | RSC + `revalidateTag` per source | ISR per route, on-demand only |
| Charts | Tremor + Recharts | visx, Nivo |

## 7. Delegations

- **Detailed schema (DDL, indexes, RLS, materialized view definitions) → @data-engineer (Dara).** This doc defines the high-level data model and access patterns ([`data-models.md`](./architecture/data-models.md)); detailed migrations are a data-engineering task during Epic 1 (Story 1.2) and Epic 4 (Story 4.1).
- **Frontend spec / design system → @ux-design-expert (Uma).**
- **CI/CD pipeline + deploy + push → @devops (Gage).**

## 8. Next Steps

- @data-engineer: detailed schema + migrations for `app_user`, raw tables, `sync_state`, and `unified_user` view.
- @sm: `*draft` story 1.1 using this architecture + PRD epic 1.
- @ux-design-expert: front-end spec from `docs/prd/ui-goals.md`.
