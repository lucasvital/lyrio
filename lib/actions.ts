"use server";

import { revalidateTag } from "next/cache";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";
import { rcGet, rcProjectId } from "@/lib/sync/revenuecat/client";

/** Diagnostic: raw RevenueCat shapes for one customer (shown in Settings). */
export async function debugRevenueCat(): Promise<unknown> {
  try {
    const pid = rcProjectId();
    const customers = (await rcGet(`/v2/projects/${pid}/customers?limit=3`)) as {
      items?: Array<{ id?: string }>;
    };
    const first = customers.items?.[0];
    const id = first?.id;
    const safe = async (path: string) => {
      try {
        return await rcGet(path);
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    };
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
    return {
      projectId: pid,
      customerCount: customers.items?.length ?? 0,
      customersSample: customers,
      firstCustomerId: id ?? null,
      detail,
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
