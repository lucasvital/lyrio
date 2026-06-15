"use server";

import { revalidateTag } from "next/cache";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";

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
