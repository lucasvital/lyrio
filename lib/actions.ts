"use server";

import { revalidateTag } from "next/cache";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";
import { rcGet, rcProjectId } from "@/lib/sync/revenuecat/client";

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
