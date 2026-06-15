# Coding Standards (dev-always)

> Canonical mirror for @dev. Full version: `docs/architecture/coding-standards.md`.

- TypeScript strict; no `any` without justification.
- ESLint + Prettier; absolute imports via `@/` (Constitution Article VI).
- **Secrets server-side only** — no API key/DB URL/token in client bundle. External API calls only in `lib/sync/` or route handlers.
- **RSC for reads**, client components only for interactivity.
- **Validate at boundaries** with Zod (env + external payloads).
- **Idempotent sync** — upsert by natural id; no duplicates on re-run.
- **Cursors over full scans** — advance `sync_state` checkpoint each run.
- Retry/backoff on 429/5xx; isolate sync failures per source; structured logs (pino).
- Tests required for sync, identity, auth before marking a story done.
- `CRON_SECRET` guards `/api/sync/*`; Auth.js middleware guards `(dashboard)`.
