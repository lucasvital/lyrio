# Lyrio Analytics Dashboard — PRD (Sharded Index)

> Source: `docs/prd.md` · Sharded by @pm (Morgan) · 2026-06-15

## Sections

- [Goals and Background Context](./goals-and-context.md)
- [Requirements (FR/NFR)](./requirements.md)
- [User Interface Design Goals](./ui-goals.md)
- [Technical Assumptions](./technical-assumptions.md)

## Epics

| # | Epic | File | Stories |
|---|------|------|---------|
| 1 | Foundation & Auth | [epic-1-foundation-auth.md](./epic-1-foundation-auth.md) | 1.1 – 1.4 |
| 2 | PostHog Integration | [epic-2-posthog-integration.md](./epic-2-posthog-integration.md) | 2.1 – 2.3 |
| 3 | RevenueCat Integration | [epic-3-revenuecat-integration.md](./epic-3-revenuecat-integration.md) | 3.1 – 3.3 |
| 4 | Unified Analytics (Identity Mapping) | [epic-4-unified-analytics.md](./epic-4-unified-analytics.md) | 4.1 – 4.3 |
| 5 | Advanced Dashboards & Visualizations | [epic-5-dashboards-visualizations.md](./epic-5-dashboards-visualizations.md) | 5.1 – 5.3 |

## Locked Decisions

- **Auth:** Auth.js (NextAuth)
- **PostHog:** Cloud US
- **Data strategy:** Sync + own Postgres database
- **Identity key:** `distinct_id` (PostHog) ↔ `app_user_id` (RevenueCat)
- **Repo:** Monorepo · **Architecture:** Serverless (Next.js App Router on Vercel) · **Testing:** Unit + Integration
