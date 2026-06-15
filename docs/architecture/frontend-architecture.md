# Frontend Architecture

## Rendering Model

- **React Server Components by default.** Dashboard pages fetch data server-side via `lib/analytics/` and stream HTML.
- **Client Components** only for interactivity: filters, chart hover/zoom, theme toggle.

## Routing

- App Router with route groups: `(auth)` (public) and `(dashboard)` (protected).
- Pages: `overview`, `posthog`, `revenuecat`, `unified`, `users/[id]`, `settings`.

## State

- **Global filters (period, segment) live in the URL** (search params) → shareable, server-readable, drives RSC queries (FR13, Story 5.2).
- No heavy global client store; URL + server state is the source of truth.
- Light client state (e.g., open menus) via React state.

## Charts & UI

- **Tremor + Recharts** wrapped in `components/charts/` (Series, Bar, Funnel, CohortHeatmap).
- **shadcn/ui** for primitives (cards, tabs, dialogs); **Tailwind** for layout.
- Theme: light/dark via CSS variables.

## Accessibility (WCAG AA — NFR8)

- Semantic HTML, ARIA on interactive charts, keyboard navigation, sufficient contrast.

## Performance

- RSC + cached queries for < 2s loads.
- Code-split client chart bundles; lazy-load heavy visualizations.
- Skeleton/loading states via Suspense.

## Layout Shell (Story 1.4)

- Sidebar nav (Overview, PostHog, RevenueCat, Unified, Settings), global period filter in header, responsive (desktop-first, collapses on mobile).
