# Lyrio Analytics Dashboard

Unified analytics dashboard joining **PostHog** (product) and **RevenueCat** (revenue) into one Next.js app, deployable to Vercel. Behavior and revenue are analyzed **together** (joined by `distinct_id` = `app_user_id`) and **separately**.

## Stack

Next.js 15 (App Router) · React 19 · TypeScript · Auth.js v5 · Neon/Postgres · Drizzle ORM · Tailwind · Recharts · Vercel Cron.

See `docs/prd.md` and `docs/architecture.md` for the full PRD and architecture.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run db:generate                  # generate SQL migration from schema
npm run db:migrate                   # apply migrations to your database
npm run dev                          # http://localhost:3000
```

### Required environment variables

All variables live in `.env.local` (never committed). See `.env.local.example`:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres connection string (Neon recommended) |
| `AUTH_SECRET` | Auth.js secret (`npx auth secret`) |
| `AUTH_URL` | App base URL (local: `http://localhost:3000`) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | The single admin login (email + password) |
| `POSTHOG_API_KEY` / `POSTHOG_PROJECT_ID` | PostHog Cloud US API |
| `REVENUECAT_API_KEY` / `REVENUECAT_PROJECT_ID` | RevenueCat API |
| `CRON_SECRET` | Protects `/api/sync/*` and Vercel Cron |

## Data sync

Sync is triggered by hitting the protected endpoints `POST /api/sync/posthog`
and `POST /api/sync/revenuecat` (header `Authorization: Bearer $CRON_SECRET`).
Three ways to trigger them:

1. **GitHub Actions (default, plan-independent)** — `.github/workflows/sync.yml`
   runs hourly. Configure in the repo:
   - Secret `CRON_SECRET` (same value as the app env)
   - Variable `APP_URL` (e.g. `https://your-app.vercel.app`)
   This avoids Vercel Cron entirely (Hobby plan only allows daily cron / limited
   jobs), so it does not conflict with crons in your other Vercel projects.
2. **Manual** — the **Settings** page has Sync buttons (server actions).
3. **Vercel Cron (optional, Pro plan)** — add a `vercel.json` with a `crons`
   entry if you prefer Vercel to schedule it. Not included by default.

Any external scheduler (cron-job.org, Upstash QStash, EasyCron…) works too —
just call the endpoints with the `CRON_SECRET` bearer token.

Sync is incremental (cursor stored in `sync_state`) and idempotent (upsert by
natural id), so overlapping or repeated triggers are safe.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Vitest unit tests |
| `npm run db:generate` | Generate Drizzle migration |
| `npm run db:migrate` | Apply migrations |

## Deploy (Vercel)

1. Import the repo in Vercel.
2. Add all env vars from the table above in Project Settings.
3. Deploy.
4. Open the app → **Settings** → click **Initialize database** (creates tables),
   then **Sync PostHog** / **Sync RevenueCat** to pull data.
   - The schema is also created automatically on the first sync, so you can skip
     step 4's first button if you trigger a sync directly.
   - No local `db:migrate` needed for serverless: `ensureSchema()` runs
     idempotently (`CREATE TABLE IF NOT EXISTS`) before each sync.
5. Scheduling: configure the GitHub Actions `CRON_SECRET` secret + `APP_URL`
   variable (see "Data sync") so syncs run hourly.

> **Empty dashboards?** It means no sync has run yet (or credentials/DB are not
> set). Go to Settings, click Initialize database, then Sync. Check the sync
> status line — it shows `ok` + last run, or the exact error.
