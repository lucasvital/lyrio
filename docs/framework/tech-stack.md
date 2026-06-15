# Tech Stack (dev-always)

> Canonical mirror for @dev. Full rationale: `docs/architecture/tech-stack.md`.

- **Language:** TypeScript 5.x (strict)
- **Framework:** Next.js 15 (App Router) + React 19
- **Auth:** Auth.js (NextAuth) v5 — Google OAuth + email
- **DB:** Neon Postgres (serverless) via `@neondatabase/serverless`
- **ORM/migrations:** Drizzle ORM + drizzle-kit
- **Validation:** Zod
- **Styling/UI:** Tailwind CSS + shadcn/ui
- **Charts:** Tremor + Recharts
- **Scheduling:** Vercel Cron
- **Logging:** pino
- **Testing:** Vitest (unit + integration)
- **Lint/format:** ESLint + Prettier
- **Hosting:** Vercel (front+back)

**Locked constraints:** Auth.js · PostHog Cloud US · sync to own Postgres · identity `distinct_id`↔`app_user_id` · monorepo serverless · unit+integration tests.
