# Source Tree (dev-always)

> Canonical mirror for @dev. Full version: `docs/architecture/source-tree.md`.

Monorepo single Next.js app at repo root.

```
app/
  (auth)/login/page.tsx
  (dashboard)/layout.tsx          # protected shell + nav + global filters
  (dashboard)/{overview,posthog,revenuecat,unified,settings}/page.tsx
  (dashboard)/users/[id]/page.tsx # unified user profile
  api/auth/[...nextauth]/route.ts
  api/health/route.ts
  api/sync/{posthog,revenuecat}/route.ts   # CRON_SECRET guarded
lib/
  db/{client.ts,schema.ts,migrations/}
  sync/{posthog,revenuecat}/ , sync/sync-state.ts
  identity/ , analytics/ , auth.ts , env.ts
components/{ui,charts,filters}/
tests/{unit,integration}/
middleware.ts , drizzle.config.ts , vitest.config.ts
```

Rules: server-only code in `lib/` never imported by client components; one sync module per source; analytics queries isolated and testable.
