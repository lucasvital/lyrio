# Source Tree / Project Structure

Monorepo single Next.js app at repository root.

```
/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # protected shell + nav + global filters
│   │   ├── overview/page.tsx
│   │   ├── posthog/page.tsx
│   │   ├── revenuecat/page.tsx
│   │   ├── unified/page.tsx
│   │   ├── users/[id]/page.tsx     # unified user profile
│   │   └── settings/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── health/route.ts
│   │   └── sync/
│   │       ├── posthog/route.ts    # POST, CRON_SECRET guarded
│   │       └── revenuecat/route.ts
│   └── layout.tsx
├── lib/
│   ├── db/
│   │   ├── client.ts               # Neon + Drizzle client
│   │   ├── schema.ts               # Drizzle schema
│   │   └── migrations/             # drizzle-kit output
│   ├── sync/
│   │   ├── posthog/                # client + ingest + cursor
│   │   ├── revenuecat/
│   │   └── sync-state.ts
│   ├── identity/                   # distinct_id <-> app_user_id resolution
│   ├── analytics/                  # mart queries (separate + unified)
│   ├── auth.ts                     # Auth.js config
│   └── env.ts                      # Zod-validated env
├── components/
│   ├── ui/                         # shadcn/ui
│   ├── charts/                     # Tremor/Recharts wrappers
│   └── filters/                    # global period/segment filters
├── tests/
│   ├── unit/
│   └── integration/
├── middleware.ts                   # auth guard
├── drizzle.config.ts
├── vitest.config.ts
└── docs/
```

## Conventions

- Server-only code under `lib/` never imported by client components.
- One sync module per source; shared checkpoint logic in `sync-state.ts`.
- Analytics queries isolated in `lib/analytics/` (testable, no React).
