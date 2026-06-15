import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { DateRange } from "./posthog";

/**
 * Cross-platform insights (Story 4.3): revenue correlated with behavior, joined
 * by the canonical app_user id (distinct_id == app_user_id).
 */

export interface RevenueByEngagement {
  bucket: string;
  users: number;
  revenue: number;
  avgRevenue: number;
}

/** Revenue grouped by behavior cohort (event-count buckets) within the range. */
export async function getRevenueByEngagement(range: DateRange): Promise<RevenueByEngagement[]> {
  const rows = await db.execute<{
    bucket: string;
    users: number;
    revenue: number;
  }>(sql`
    WITH behavior AS (
      SELECT distinct_id, count(*) AS events
      FROM posthog_event
      WHERE timestamp >= ${range.from.toISOString()} AND timestamp < ${range.to.toISOString()}
      GROUP BY distinct_id
    ),
    revenue AS (
      SELECT app_user_id, coalesce(total_spent_usd, 0) AS revenue
      FROM revenuecat_subscriber
    ),
    joined AS (
      SELECT
        u.id,
        coalesce(b.events, 0) AS events,
        coalesce(r.revenue, 0) AS revenue
      FROM app_user u
      LEFT JOIN behavior b ON b.distinct_id = u.id
      LEFT JOIN revenue r ON r.app_user_id = u.id
      WHERE b.events IS NOT NULL OR r.revenue > 0
    )
    SELECT
      CASE
        WHEN events = 0 THEN '0 (revenue only)'
        WHEN events BETWEEN 1 AND 10 THEN '1-10'
        WHEN events BETWEEN 11 AND 50 THEN '11-50'
        WHEN events BETWEEN 51 AND 200 THEN '51-200'
        ELSE '200+'
      END AS bucket,
      count(*)::int AS users,
      coalesce(sum(revenue), 0)::float AS revenue
    FROM joined
    GROUP BY 1
    ORDER BY min(events)
  `);
  return rows.map((r) => ({
    bucket: r.bucket,
    users: r.users,
    revenue: r.revenue,
    avgRevenue: r.users > 0 ? r.revenue / r.users : 0,
  }));
}

export interface ConversionFunnel {
  totalUsers: number;
  activatedUsers: number;
  payingUsers: number;
  activationRate: number;
  conversionRate: number;
}

/** Activation -> subscription funnel (Story 4.3). */
export async function getConversionFunnel(range: DateRange): Promise<ConversionFunnel> {
  const rows = await db.execute<{
    total: number;
    activated: number;
    paying: number;
  }>(sql`
    WITH activity AS (
      SELECT distinct_id, count(*) AS events
      FROM posthog_event
      WHERE timestamp >= ${range.from.toISOString()} AND timestamp < ${range.to.toISOString()}
      GROUP BY distinct_id
    )
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE a.events >= 3)::int AS activated,
      count(*) FILTER (WHERE coalesce(r.total_spent_usd, 0) > 0)::int AS paying
    FROM app_user u
    LEFT JOIN activity a ON a.distinct_id = u.id
    LEFT JOIN revenuecat_subscriber r ON r.app_user_id = u.id
  `);
  const row = rows[0] ?? { total: 0, activated: 0, paying: 0 };
  return {
    totalUsers: row.total,
    activatedUsers: row.activated,
    payingUsers: row.paying,
    activationRate: row.total > 0 ? row.activated / row.total : 0,
    conversionRate: row.activated > 0 ? row.paying / row.activated : 0,
  };
}

export interface UnifiedUserProfile {
  id: string;
  email: string | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  totalEvents: number;
  totalRevenue: number;
  isSubscriber: boolean;
  hasPosthog: boolean;
  hasRevenuecat: boolean;
}

/** Unified profile for a single user (Story 4.2). */
export async function getUnifiedUserProfile(
  id: string,
): Promise<UnifiedUserProfile | null> {
  const rows = await db.execute<{
    id: string;
    email: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    total_events: number;
    total_revenue: number;
    is_subscriber: boolean;
    has_posthog: boolean;
    has_revenuecat: boolean;
  }>(sql`
    SELECT
      u.id,
      u.email,
      to_char(u.first_seen_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS first_seen_at,
      to_char(u.last_seen_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS last_seen_at,
      (SELECT count(*)::int FROM posthog_event e WHERE e.distinct_id = u.id) AS total_events,
      coalesce(r.total_spent_usd, 0)::float AS total_revenue,
      (r.app_user_id IS NOT NULL AND r.is_active) AS is_subscriber,
      EXISTS (SELECT 1 FROM posthog_event e WHERE e.distinct_id = u.id) AS has_posthog,
      (r.app_user_id IS NOT NULL) AS has_revenuecat
    FROM app_user u
    LEFT JOIN revenuecat_subscriber r ON r.app_user_id = u.id
    WHERE u.id = ${id}
    LIMIT 1
  `);
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    email: r.email,
    firstSeenAt: r.first_seen_at,
    lastSeenAt: r.last_seen_at,
    totalEvents: r.total_events,
    totalRevenue: r.total_revenue,
    isSubscriber: r.is_subscriber,
    hasPosthog: r.has_posthog,
    hasRevenuecat: r.has_revenuecat,
  };
}
