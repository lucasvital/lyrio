import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appUser } from "@/lib/db/schema";

/**
 * Identity resolution (Story 4.1). distinct_id (PostHog) == app_user_id
 * (RevenueCat) is the locked join key. Ensures a canonical app_user row exists
 * for a given id (idempotent upsert), keeping no-match rows from either source.
 */
export async function ensureAppUser(
  id: string,
  patch: { email?: string | null; seenAt?: Date } = {},
): Promise<void> {
  if (!id) return;
  const seenAt = patch.seenAt ?? new Date();
  await db
    .insert(appUser)
    .values({
      id,
      email: patch.email ?? null,
      firstSeenAt: seenAt,
      lastSeenAt: seenAt,
    })
    .onConflictDoUpdate({
      target: appUser.id,
      set: {
        email: patch.email ?? sql`coalesce(${appUser.email}, excluded.email)`,
        lastSeenAt: seenAt,
      },
    });
}

export interface MatchCoverage {
  total: number;
  matched: number;
  posthogOnly: number;
  revenuecatOnly: number;
  matchRate: number;
}

/**
 * Coverage of the PostHog <-> RevenueCat join (FR8). Computed from canonical
 * app_user joined to both source tables.
 */
export async function getMatchCoverage(): Promise<MatchCoverage> {
  const rows = await db.execute<{
    total: number;
    matched: number;
    posthog_only: number;
    revenuecat_only: number;
  }>(sql`
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE p.distinct_id IS NOT NULL AND r.app_user_id IS NOT NULL)::int AS matched,
      count(*) FILTER (WHERE p.distinct_id IS NOT NULL AND r.app_user_id IS NULL)::int AS posthog_only,
      count(*) FILTER (WHERE p.distinct_id IS NULL AND r.app_user_id IS NOT NULL)::int AS revenuecat_only
    FROM app_user u
    LEFT JOIN posthog_person p ON p.distinct_id = u.id
    LEFT JOIN revenuecat_subscriber r ON r.app_user_id = u.id
  `);
  const row = rows[0] ?? {
    total: 0,
    matched: 0,
    posthog_only: 0,
    revenuecat_only: 0,
  };
  return {
    total: row.total,
    matched: row.matched,
    posthogOnly: row.posthog_only,
    revenuecatOnly: row.revenuecat_only,
    matchRate: row.total > 0 ? row.matched / row.total : 0,
  };
}
