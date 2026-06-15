# Tech Stack

> Definitive technology selection. Constraints from PRD are locked; open decisions resolved by @architect.

| Category | Technology | Version (target) | Rationale |
|----------|------------|------------------|-----------|
| Language | TypeScript | 5.x | Type safety across stack |
| Framework | Next.js (App Router) | 15.x | Full-stack on Vercel, RSC, route handlers |
| UI runtime | React | 19.x | RSC + client components |
| Auth | Auth.js (NextAuth) | v5 | Locked decision; Google OAuth + email |
| Database | Neon Postgres | serverless | Scales to zero, branching, native on Vercel |
| ORM / migrations | Drizzle ORM + drizzle-kit | latest | SQL-first, low serverless cold start, type-safe |
| DB driver | `@neondatabase/serverless` | latest | HTTP/WebSocket driver for serverless |
| Validation | Zod | 3.x | Env + external API payload parsing |
| Styling | Tailwind CSS | 3.x | Utility-first |
| UI primitives | shadcn/ui | latest | Accessible component base |
| Charts | Tremor + Recharts | latest | Dashboard-grade charts (funnel, cohort, series) |
| Scheduling | Vercel Cron | — | Triggers incremental sync hourly |
| Logging | pino | latest | Structured logs |
| Testing (unit) | Vitest | latest | Fast, TS-native |
| Testing (integration) | Vitest + test DB | latest | Sync, identity, auth paths |
| Lint/format | ESLint + Prettier | latest | Consistency |
| Hosting | Vercel | — | Locked decision (front+back) |

## Constraints (locked, do not change without @pm)

- Auth.js · PostHog Cloud US · sync to own Postgres · identity join `distinct_id`↔`app_user_id` · monorepo serverless · unit+integration tests.

## Override notes

- ORM alternative: Prisma. DB alternative: Vercel Postgres (Neon-backed) or Supabase. Chart alternative: visx/Nivo.
