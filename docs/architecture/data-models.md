# Data Models (High-Level)

> @architect defines the conceptual model and access patterns. **Detailed DDL, indexes, constraints, and view definitions are delegated to @data-engineer (Dara)** — see Story 1.2 (baseline) and Story 4.1 (identity).

## Core Entities

### app_user (canonical identity)
The unification anchor. Canonical id == shared `distinct_id` (PostHog) == `app_user_id` (RevenueCat).

| field | notes |
|-------|-------|
| id | canonical user id (= distinct_id = app_user_id) |
| email | optional, when available |
| first_seen_at / last_seen_at | derived |

### posthog_person
| field | notes |
|-------|-------|
| distinct_id | FK → app_user.id |
| properties | jsonb |
| ... | persons payload (raw) |

### posthog_event (raw, high-volume)
| field | notes |
|-------|-------|
| event_id | natural id (idempotent upsert) |
| distinct_id | FK → app_user.id |
| event, timestamp, properties(jsonb) | |

### revenuecat_subscriber
| field | notes |
|-------|-------|
| app_user_id | FK → app_user.id |
| entitlements(jsonb), original_purchase_date | |

### revenuecat_transaction
| field | notes |
|-------|-------|
| transaction_id | natural id (idempotent upsert) |
| app_user_id | FK → app_user.id |
| product_id, price, currency, purchased_at, type | |

### sync_state
Checkpoint table (see backend-architecture.md).

## Derived / Marts

- **`unified_user` (view)** — joins `app_user` ⨝ `posthog_person` ⨝ `revenuecat_subscriber` (LEFT joins to keep no-match rows). Exposes match coverage (FR8, Story 4.1).
- **Behavior cohorts × revenue** (materialized view) — for cross-platform insights (Story 4.3).
- **Revenue KPIs** (view) — MRR, active subs, churn, trials (Story 3.3).
- **Product KPIs** (view) — active users, retention, funnels (Story 2.3).

## Identity Resolution Rules (Story 4.1)

1. Match by `distinct_id == app_user_id` (locked decision).
2. Rows present in only one source are retained (no-match handling).
3. Expose `% matched` coverage metric.
4. Duplicates collapse to canonical `app_user`.
