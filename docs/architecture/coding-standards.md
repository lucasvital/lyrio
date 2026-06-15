# Coding Standards

## Language & Style

- TypeScript strict mode (`strict: true`). No `any` unless justified with comment.
- ESLint + Prettier enforced; CI fails on lint errors.
- Absolute imports via `@/` path alias (Constitution Article VI).

## Architecture Rules

- **Server-side secrets only.** No API key, DB URL, or token reaches the client bundle. External API calls (PostHog/RevenueCat) happen only in `lib/sync/` or route handlers.
- **RSC for reads.** Dashboard pages are Server Components reading the DB via Drizzle. Client components only for interactivity (filters, charts).
- **Validate at boundaries.** Parse env with Zod (`lib/env.ts`); parse external API responses with Zod schemas before persisting.
- **Idempotent sync.** All ingest uses upsert keyed by natural id; re-running a sync must not duplicate rows.
- **Cursors over full scans.** Every sync advances a checkpoint in `sync_state`; never refetch full history on schedule.

## Error Handling

- Wrap external calls with retry/backoff on 429 and 5xx (exponential, capped).
- Sync failures are isolated per source and recorded in `sync_state` (status + error), never crash the whole job.
- Use structured logging (pino) with a `source` field.

## Testing

- Unit tests for pure logic (identity resolution, metric transforms, cursor math).
- Integration tests for sync idempotency/resume, auth flow, unified profile assembly.
- No network in tests — mock external APIs; use a disposable test DB for integration.

## Security

- `CRON_SECRET` required on `/api/sync/*` (reject otherwise).
- Auth.js middleware protects all `(dashboard)` routes.
- httpOnly, secure cookies; configurable session expiry.
