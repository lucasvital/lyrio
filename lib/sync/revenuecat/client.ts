import { z } from "zod";
import { getEnv } from "@/lib/env";
import { fetchWithRetry } from "@/lib/sync/http";

/**
 * RevenueCat API client (server-side only). Confirm v1/v2 endpoint coverage
 * against official docs (docs/architecture/external-apis.md).
 */
const transactionSchema = z.object({
  id: z.string(),
  app_user_id: z.string(),
  product_id: z.string().nullable().optional(),
  store: z.string().nullable().optional(),
  type: z.string().nullable().optional(),
  revenue_in_usd: z.number().nullable().optional(),
  currency: z.string().nullable().optional(),
  purchased_at: z.string(),
});

const transactionsResponseSchema = z.object({
  items: z.array(transactionSchema),
  next_page: z.string().nullable().optional(),
});

export type RevenueCatTransaction = z.infer<typeof transactionSchema>;

function config() {
  const env = getEnv();
  if (!env.REVENUECAT_API_KEY || !env.REVENUECAT_PROJECT_ID) {
    throw new Error(
      "RevenueCat credentials missing (REVENUECAT_API_KEY / REVENUECAT_PROJECT_ID)",
    );
  }
  return {
    baseUrl: env.REVENUECAT_BASE_URL,
    apiKey: env.REVENUECAT_API_KEY,
    projectId: env.REVENUECAT_PROJECT_ID,
  };
}

export async function fetchTransactionsPage(params: {
  startingAfter?: string | null;
  nextPage?: string | null;
}): Promise<{ transactions: RevenueCatTransaction[]; nextPage: string | null }> {
  const { baseUrl, apiKey, projectId } = config();

  const url =
    params.nextPage ??
    `${baseUrl}/v2/projects/${projectId}/transactions?` +
      new URLSearchParams({
        ...(params.startingAfter ? { starting_after: params.startingAfter } : {}),
        limit: "100",
      }).toString();

  const res = await fetchWithRetry(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`RevenueCat request failed: ${res.status} ${res.statusText}`);
  }

  const parsed = transactionsResponseSchema.parse(await res.json());
  return { transactions: parsed.items, nextPage: parsed.next_page ?? null };
}
