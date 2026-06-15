"use server";

import { revalidateTag } from "next/cache";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";

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
