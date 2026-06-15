# Technical Assumptions

> Constraints para o @architect. Decisões fechadas com o stakeholder em 2026-06-15.

## Repository Structure: Monorepo

Aplicação Next.js full-stack única (front + back), deploy unificado na Vercel.

## Service Architecture

Serverless dentro do Next.js (App Router). Route handlers para a API interna; **Vercel Cron** para jobs de sync. Camada de dados em **Postgres** (provider a definir pelo @architect), com sync incremental armazenando dados de PostHog e RevenueCat.

## Testing Requirements

**Unit + Integration.** Prioridade: lógica de sync, identity mapping (`distinct_id`↔`app_user_id`), auth e transformações de métricas. E2E em epic posterior.

## Additional Technical Assumptions and Requests

- **Auth:** Auth.js (NextAuth) — fechado.
- **PostHog:** Cloud US — fechado.
- **Estratégia de dados:** sync + banco próprio — fechado.
- **Chave de identidade:** `distinct_id` ↔ `app_user_id` — fechado.
- ORM (Prisma vs Drizzle) e provider Postgres: **a definir pelo @architect**.
- Biblioteca de gráficos (Recharts/visx/Tremor): **a definir pelo @architect/@ux**.
- Estratégia de cache/revalidação de leituras: **a definir pelo @architect**.
