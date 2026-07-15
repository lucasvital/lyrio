"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { auth } from "@/lib/auth";
import { influencer, userAttribution } from "@/lib/db/schema";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";
import { syncAttribution } from "@/lib/attribution/sync";
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
    const counts = await db.execute<{
      ph: number;
      rc: number;
      matched_distinct_id: number;
      matched_user_id: number;
      matched_distinct_id_prop: number;
    }>(sql`
      SELECT
        (SELECT count(DISTINCT distinct_id) FROM posthog_event)::int AS ph,
        (SELECT count(*) FROM revenuecat_subscriber)::int AS rc,
        (SELECT count(*) FROM revenuecat_subscriber r
          WHERE EXISTS (SELECT 1 FROM posthog_event e WHERE e.distinct_id = r.app_user_id))::int AS matched_distinct_id,
        (SELECT count(*) FROM revenuecat_subscriber r
          WHERE EXISTS (SELECT 1 FROM posthog_event e WHERE e.properties->>'$user_id' = r.app_user_id))::int AS matched_user_id,
        (SELECT count(*) FROM revenuecat_subscriber r
          WHERE EXISTS (SELECT 1 FROM posthog_event e WHERE e.properties->>'distinct_id' = r.app_user_id))::int AS matched_distinct_id_prop
    `);

    const sampleProps = await db.execute<Record<string, unknown>>(sql`
      SELECT
        distinct_id,
        properties->>'$user_id' AS prop_user_id,
        properties->>'distinct_id' AS prop_distinct_id,
        properties->>'$is_identified' AS is_identified
      FROM posthog_event
      WHERE properties ? '$user_id' OR properties ? 'distinct_id'
      LIMIT 10
    `);

    return {
      counts: counts[0],
      samplePosthogDistinctIds: phIds.map((r) => r.distinct_id),
      sampleRevenuecatAppUserIds: rcIds.map((r) => r.app_user_id),
      sampleIdentityProps: sampleProps,
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

/**
 * Extract first-touch acquisition signals for every user (mobile UTM attribution).
 * Refreshes auto fields only; manual attribution is preserved.
 */
export async function triggerAttributionSync() {
  const result = await syncAttribution();
  revalidatePath("/attribution");
  revalidatePath("/influencers");
  return result;
}

/**
 * Clear the PostHog / RevenueCat sync cursors so the next sync reprocesses from
 * scratch (full backfill). Idempotent upserts mean no data is lost. Use this if
 * the PostHog cursor got stuck ahead of the unread history.
 */
export async function resetSyncCursors(): Promise<{ ok: boolean; message: string }> {
  try {
    await ensureSchema();
    await db.execute(
      sql`UPDATE sync_state SET cursor = NULL, status = 'ok', error = NULL WHERE source IN ('posthog', 'revenuecat')`,
    );
    return {
      ok: true,
      message: "Cursores resetados. Rode PostHog → RevenueCat → Attribution para reprocessar tudo.",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// Manual attribution audit
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const manualAttributionSchema = z.object({
  appUserId: z.string().min(1),
  influencerId: z.string().trim().nullish(),
  source: z.string().trim().max(200).nullish(),
  note: z.string().trim().max(1000).nullish(),
});

export type ManualAttributionInput = z.input<typeof manualAttributionSchema>;

/** Save a manual origin audit for one user (influencer and/or free-text source). */
export async function saveManualAttribution(
  input: ManualAttributionInput,
): Promise<{ ok: boolean; message: string }> {
  const parsed = manualAttributionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid input" };
  const { appUserId, influencerId, source, note } = parsed.data;

  const session = await auth();
  const by = session?.user?.email ?? "admin";
  const fields = {
    manualInfluencerId: influencerId ? influencerId : null,
    manualSource: source ? source : null,
    note: note ? note : null,
    attributedBy: by,
    attributedAt: new Date(),
  };

  try {
    await ensureSchema();
    await db
      .insert(userAttribution)
      .values({ appUserId, ...fields })
      .onConflictDoUpdate({
        target: userAttribution.appUserId,
        set: { ...fields, updatedAt: new Date() },
      });
    revalidatePath("/attribution");
    revalidatePath("/influencers");
    return { ok: true, message: "Attribution saved." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

const influencerSchema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(1, "Name is required").max(120),
  handle: z.string().trim().max(120).nullish(),
  platform: z.string().trim().max(40).nullish(),
  couponCodes: z.string().trim().max(1000).optional(), // comma / newline separated
  commissionPercent: z.coerce.number().min(0).max(100).default(30),
  notes: z.string().trim().max(1000).nullish(),
});

export interface InfluencerInput {
  id?: string;
  name: string;
  handle?: string | null;
  platform?: string | null;
  couponCodes?: string;
  commissionPercent?: string | number;
  notes?: string | null;
}

/** Create or update an influencer / referral partner. */
export async function upsertInfluencer(
  input: InfluencerInput,
): Promise<{ ok: boolean; message: string; id?: string }> {
  const parsed = influencerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { id, name, handle, platform, couponCodes, commissionPercent, notes } = parsed.data;
  const slug = (id && id.trim()) || slugify(name);
  if (!slug) return { ok: false, message: "Could not derive an id from the name." };

  const codes = (couponCodes ?? "")
    .split(/[\n,;]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  const rate = String((commissionPercent / 100).toFixed(4));

  const fields = {
    name,
    handle: handle ? handle : null,
    platform: platform ? platform : null,
    couponCodes: codes,
    commissionRate: rate,
    notes: notes ? notes : null,
  };

  try {
    await ensureSchema();
    await db
      .insert(influencer)
      .values({ id: slug, ...fields })
      .onConflictDoUpdate({ target: influencer.id, set: fields });
    revalidatePath("/influencers");
    revalidatePath("/attribution");
    return { ok: true, message: "Influencer saved.", id: slug };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}

/** Delete an influencer. Attribution rows referencing it fall back to unresolved. */
export async function deleteInfluencer(
  id: string,
): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "Missing id" };
  try {
    await ensureSchema();
    await db.delete(influencer).where(sql`id = ${id}`);
    revalidatePath("/influencers");
    revalidatePath("/attribution");
    return { ok: true, message: "Influencer deleted." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
}
