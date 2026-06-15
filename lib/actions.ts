"use server";

import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";
import { rcGet, rcProjectId } from "@/lib/sync/revenuecat/client";

/**
 * Diagnostic: inspect identifiers on both sides to choose the best join key.
 * TODO(remove): temporary debugging.
 */
export async function debugIdentity(): Promise<unknown> {
  try {
    const phIds = await db.execute<{ distinct_id: string }>(
      sql`SELECT distinct_id FROM posthog_event GROUP BY distinct_id LIMIT 10`,
    );
    const rcIds = await db.execute<{ app_user_id: string }>(
      sql`SELECT app_user_id FROM revenuecat_subscriber LIMIT 10`,
    );
    const propRows = await db.execute<{ properties: Record<string, unknown> | null }>(
      sql`SELECT properties FROM posthog_event WHERE properties IS NOT NULL LIMIT 30`,
    );
    const keys = new Set<string>();
    for (const r of propRows) {
      if (r.properties && typeof r.properties === "object") {
        for (const k of Object.keys(r.properties)) keys.add(k);
      }
    }
    const counts = await db.execute<{ ph: number; rc: number; matched: number }>(sql`
      SELECT
        (SELECT count(DISTINCT distinct_id) FROM posthog_event)::int AS ph,
        (SELECT count(*) FROM revenuecat_subscriber)::int AS rc,
        (SELECT count(*) FROM revenuecat_subscriber r
          WHERE EXISTS (SELECT 1 FROM posthog_event e WHERE e.distinct_id = r.app_user_id))::int AS matched
    `);
    return {
      counts: counts[0],
      samplePosthogDistinctIds: phIds.map((r) => r.distinct_id),
      sampleRevenuecatAppUserIds: rcIds.map((r) => r.app_user_id),
      posthogEventPropertyKeys: Array.from(keys).sort(),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Diagnostic: raw RevenueCat shapes. Pass a known customer id to inspect a payer. */
export async function debugRevenueCat(customerId?: string): Promise<unknown> {
  try {
    const pid = rcProjectId();
    const safe = async (path: string) => {
      try {
        return await rcGet(path);
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    };

    let id = customerId?.trim() || undefined;
    let customerInfo: unknown;

    if (id) {
      customerInfo = await safe(`/v2/projects/${pid}/customers/${encodeURIComponent(id)}`);
    } else {
      const customers = (await rcGet(`/v2/projects/${pid}/customers?limit=3`)) as {
        items?: Array<{ id?: string }>;
      };
      customerInfo = customers;
      id = customers.items?.[0]?.id;
    }

    const detail = id
      ? {
          active_entitlements: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/active_entitlements?limit=10`,
          ),
          subscriptions: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/subscriptions?limit=10`,
          ),
          purchases: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/purchases?limit=10`,
          ),
        }
      : null;

    return { projectId: pid, queriedCustomerId: id ?? null, customerInfo, detail };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Diagnostic: raw RevenueCat Charts API response (to map time-series shape).
 * TODO(remove): temporary debugging — delete once charts mapping is confirmed.
 */
export async function debugChart(chartName?: string): Promise<unknown> {
  try {
    const pid = rcProjectId();
    const name = (chartName?.trim() || "mrr").toLowerCase();
    const safe = async (path: string) => {
      try {
        return await rcGet(path);
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    };
    return {
      chart: name,
      options: await safe(`/v2/projects/${pid}/charts/${name}/options`),
      data: await safe(`/v2/projects/${pid}/charts/${name}?realtime=false`),
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

/** Create database tables (idempotent). Run once after setting DATABASE_URL. */
export async function initDatabase(): Promise<{ ok: boolean; message: string }> {
  try {
    await ensureSchema(true);
    return { ok: true, message: "Database ready." };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Manual sync triggers from the Settings UI (Story 2.2/3.2 AC4). Server-side. */
export async function triggerPostHogSync() {
  const result = await syncPostHog();
  revalidateTag("posthog");
  revalidateTag("unified");
  return result;
}

export async function triggerRevenueCatSync() {
  const result = await syncRevenueCat();
  revalidateTag("revenuecat");
  revalidateTag("unified");
  return result;
}
