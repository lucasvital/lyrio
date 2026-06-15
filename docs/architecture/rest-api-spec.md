# Internal API Spec

Internal endpoints (Next.js route handlers). Most reads are RSC (no public API); these are the explicit handlers.

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/health` | public | Health check: `{ status, timestamp }` (Story 1.1) |
| * | `/api/auth/[...nextauth]` | Auth.js | Sign in / out / session (Story 1.3) |
| POST | `/api/sync/posthog` | `CRON_SECRET` | Trigger incremental PostHog sync (Story 2.2) |
| POST | `/api/sync/revenuecat` | `CRON_SECRET` | Trigger incremental RevenueCat sync (Story 3.2) |

## Sync endpoint contract

**Request:** header `Authorization: Bearer ${CRON_SECRET}` (or `x-cron-secret`).

**Response 200:**
```json
{ "source": "posthog", "ingested": 1234, "cursor": "...", "durationMs": 4200 }
```
**Response 401:** invalid/missing secret.
**Response 200 with error state:** on partial failure, returns `{ "status": "error", "message": "..." }` and `sync_state` records the failure (cursor not advanced).

## Conventions

- JSON only; consistent error shape `{ error: { code, message } }`.
- All mutations server-side; no secrets in responses.
