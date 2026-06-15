# External APIs

## PostHog (Cloud US)

- **Base URL:** `https://us.posthog.com` (Cloud US — locked). Public API under `/api/`.
- **Auth:** Personal/Project API key as Bearer token (env: `POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`).
- **Data ingested (FR4):** events, persons, cohorts, insights/trends, funnels, retention.
- **Pagination:** cursor/`next` based; persist cursor in `sync_state`.
- **Rate limits:** respect 429 + `Retry-After`; exponential backoff.
- **Server-side only** (NFR3).

> Exact endpoint paths/params to be confirmed against PostHog API docs during Story 2.1 (use context7/official docs). Do not hardcode undocumented endpoints.

## RevenueCat

- **Base URL:** RevenueCat REST API **v2** (`https://api.revenuecat.com`).
- **Auth:** v2 secret API key as Bearer (env: `REVENUECAT_API_KEY`, `REVENUECAT_PROJECT_ID`).
- **Model (v2 is customer-centric — there is NO global transactions endpoint):**
  - `GET /v2/projects/{project_id}/customers` → list customers (`items`, `next_page`).
  - `GET /v2/projects/{project_id}/customers/{customer_id}/purchases` → revenue (`revenue_in_usd`, `purchased_at`).
  - Customer carries `active_entitlements` → drives `is_active` subscriber flag.
- **Data ingested (FR6):** customers/subscribers, active entitlements, purchases (revenue).
- **Pagination:** `next_page` (absolute path) cursor, persisted in `sync_state`.
- **Rate limits:** respect 429 + backoff.
- **Server-side only.**

## Identity Join

- PostHog `distinct_id` and RevenueCat `app_user_id` are treated as the **same value** (locked). The ingestion writes both into the canonical `app_user.id`.

## Secrets (Vercel env)

```
POSTHOG_API_KEY, POSTHOG_PROJECT_ID
REVENUECAT_API_KEY, REVENUECAT_PROJECT_ID
DATABASE_URL                # Neon
AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
CRON_SECRET
```
