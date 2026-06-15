# Backend Architecture

## Overview

Serverless backend inside Next.js (route handlers + RSC). No separate service. Two responsibilities: (1) serve authenticated reads, (2) ingest external data on a schedule.

## Ingestion (Sync) Design

### Trigger

- **Vercel Cron** (configured in `vercel.json`) calls `POST /api/sync/posthog` and `POST /api/sync/revenuecat` hourly (NFR6 configurable).
- Manual trigger: same endpoints, callable from Settings UI (server action) — also `CRON_SECRET` guarded.

### Flow (per source)

```
1. Authorize (CRON_SECRET header)            → 401 if invalid
2. Load checkpoint from sync_state           → cursor / last_synced_at
3. Fetch incremental page(s) from API        → retry/backoff on 429/5xx
4. Validate payload (Zod)                     → skip+log invalid
5. Upsert raw rows (idempotent)              → keyed by natural id
6. Advance checkpoint in sync_state          → status=ok, last_run=now
7. revalidateTag(source)                      → refresh dashboards
   on error → sync_state.status=error, store message, do not advance cursor
```

### sync_state table (high-level — DDL by @data-engineer)

| field | purpose |
|-------|---------|
| source | 'posthog' \| 'revenuecat' \| 'posthog:events' ... |
| cursor | opaque pagination cursor / timestamp |
| last_run_at | last execution |
| status | ok \| error \| running |
| error | last error message |

## Read Path

- RSC pages import query functions from `lib/analytics/` which run Drizzle queries against marts/views.
- Queries wrapped in `unstable_cache` with tags `posthog` / `revenuecat` / `unified`.
- Sync completion invalidates the matching tag → next read is fresh, otherwise served from cache (< 2s, NFR5).

## API Clients

- `lib/sync/posthog/client.ts` — base URL `https://us.posthog.com` (Cloud US), bearer API key from env.
- `lib/sync/revenuecat/client.ts` — RevenueCat REST, bearer API key from env.
- Shared `withRetry()` helper: exponential backoff, max attempts, honors `Retry-After`.

## Auth Backend

- Auth.js v5 at `/api/auth/[...nextauth]`; session strategy: database or JWT (data-engineer to confirm session table if DB strategy).
- `middleware.ts` guards `(dashboard)` segment.

## Security

- Secrets via Vercel env; never in client.
- `/api/sync/*` rejects requests without valid `CRON_SECRET`.
- Input validation with Zod on all external payloads.
