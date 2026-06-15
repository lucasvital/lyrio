import { z } from "zod";
import { getEnv } from "@/lib/env";
import { fetchWithRetry } from "@/lib/sync/http";

/**
 * RevenueCat REST API v2 client (server-side only).
 * v2 is customer-centric: list customers, then per-customer purchases.
 * Docs: https://www.revenuecat.com/docs/api-v2
 */

const customerSchema = z
  .object({
    id: z.string(),
    first_seen_at: z.union([z.number(), z.string()]).nullable().optional(),
    last_seen_at: z.union([z.number(), z.string()]).nullable().optional(),
    active_entitlements: z
      .object({
        items: z
          .array(z.object({ entitlement_id: z.string().optional() }).passthrough())
          .default([]),
      })
      .partial()
      .optional(),
  })
  .passthrough();

const customersListSchema = z
  .object({
    items: z.array(customerSchema).default([]),
    next_page: z.string().nullable().optional(),
  })
  .passthrough();

const purchaseSchema = z
  .object({
    id: z.string(),
    product_id: z.string().nullable().optional(),
    store: z.string().nullable().optional(),
    purchased_at: z.union([z.number(), z.string()]).nullable().optional(),
    revenue_in_usd: z.unknown().optional(),
  })
  .passthrough();

const purchasesListSchema = z
  .object({
    items: z.array(purchaseSchema).default([]),
    next_page: z.string().nullable().optional(),
  })
  .passthrough();

const entitlementsListSchema = z
  .object({
    items: z
      .array(
        z
          .object({
            entitlement_id: z.string().optional(),
            id: z.string().optional(),
          })
          .passthrough(),
      )
      .default([]),
    next_page: z.string().nullable().optional(),
  })
  .passthrough();

export type RevenueCatCustomer = z.infer<typeof customerSchema>;
export type RevenueCatPurchase = z.infer<typeof purchaseSchema>;

function config() {
  const env = getEnv();
  if (!env.REVENUECAT_API_KEY || !env.REVENUECAT_PROJECT_ID) {
    throw new Error(
      "RevenueCat credentials missing (REVENUECAT_API_KEY / REVENUECAT_PROJECT_ID)",
    );
  }
  return {
    baseUrl: env.REVENUECAT_BASE_URL.replace(/\/$/, ""),
    apiKey: env.REVENUECAT_API_KEY,
    projectId: env.REVENUECAT_PROJECT_ID,
  };
}

async function get(path: string) {
  const { baseUrl, apiKey } = config();
  // next_page comes back as an absolute path like "/v2/projects/.../customers?..."
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`RevenueCat request failed: ${res.status} ${res.statusText} (${url})`);
  }
  return res.json();
}

/** Raw GET against the RevenueCat API (used by the debug endpoint). */
export async function rcGet(path: string): Promise<unknown> {
  return get(path);
}

/** Project id helper for callers that build raw paths. */
export function rcProjectId(): string {
  return config().projectId;
}

/** One page of customers. `nextPath` is the `next_page` value from a prior page. */
export async function listCustomersPage(nextPath?: string | null): Promise<{
  customers: RevenueCatCustomer[];
  nextPage: string | null;
}> {
  const { projectId } = config();
  const path = nextPath ?? `/v2/projects/${projectId}/customers?limit=100`;
  const parsed = customersListSchema.parse(await get(path));
  return { customers: parsed.items, nextPage: parsed.next_page ?? null };
}

export interface RevenueCatOverview {
  activeTrials: number;
  activeSubscriptions: number;
  mrr: number;
  revenue28d: number;
  newCustomers28d: number;
  activeUsers28d: number;
  raw: Record<string, unknown>;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** Normalize the overview response (handles both `metrics` array and flat shapes). */
function normalizeOverview(data: unknown): RevenueCatOverview {
  const d = (data ?? {}) as Record<string, unknown>;
  const out: RevenueCatOverview = {
    activeTrials: 0,
    activeSubscriptions: 0,
    mrr: 0,
    revenue28d: 0,
    newCustomers28d: 0,
    activeUsers28d: 0,
    raw: d,
  };

  if (Array.isArray(d.metrics)) {
    for (const m of d.metrics as Array<Record<string, unknown>>) {
      const id = String(m.id ?? m.name ?? "").toLowerCase();
      const v = num(m.value);
      if (id.includes("trial")) out.activeTrials = v;
      else if (id.includes("subscription")) out.activeSubscriptions = v;
      else if (id === "mrr") out.mrr = v;
      else if (id.includes("revenue")) out.revenue28d = v;
      else if (id.includes("new_customer")) out.newCustomers28d = v;
      else if (id.includes("active_user") || id.includes("active_customer"))
        out.activeUsers28d = v;
    }
    return out;
  }

  out.activeTrials = num(d.active_trials);
  out.activeSubscriptions = num(d.active_subscriptions);
  out.mrr = num(d.mrr);
  out.revenue28d = num(d.revenue_last_28_days ?? d.revenue);
  out.newCustomers28d = num(d.new_customers_last_28_days ?? d.new_customers);
  out.activeUsers28d = num(
    d.active_users_last_28_days ?? d.active_customers ?? d.active_users,
  );
  return out;
}

/** Aggregate metrics from /v2/projects/{id}/metrics/overview (matches the dashboard). */
export async function fetchOverviewMetrics(): Promise<RevenueCatOverview> {
  const { projectId } = config();
  const data = await get(`/v2/projects/${projectId}/metrics/overview`);
  return normalizeOverview(data);
}

/** Active entitlement ids for a customer (recommended source of "active" status). */
export async function listActiveEntitlements(customerId: string): Promise<string[]> {
  const { projectId } = config();
  const parsed = entitlementsListSchema.parse(
    await get(
      `/v2/projects/${projectId}/customers/${encodeURIComponent(customerId)}/active_entitlements?limit=50`,
    ),
  );
  return parsed.items
    .map((e) => e.entitlement_id ?? e.id)
    .filter((e): e is string => !!e);
}

/** All purchases for a customer (bounded pages). */
export async function listCustomerPurchases(
  customerId: string,
  maxPages = 5,
): Promise<RevenueCatPurchase[]> {
  const { projectId } = config();
  let path: string | null =
    `/v2/projects/${projectId}/customers/${encodeURIComponent(customerId)}/purchases?limit=100`;
  const all: RevenueCatPurchase[] = [];
  for (let page = 0; page < maxPages && path; page++) {
    const parsed = purchasesListSchema.parse(await get(path));
    all.push(...parsed.items);
    path = parsed.next_page ?? null;
  }
  return all;
}

/** Extract gross USD from the v2 `revenue_in_usd` object (or number). */
export function grossUsd(revenue: unknown): number | null {
  if (revenue == null) return null;
  if (typeof revenue === "number") return revenue;
  if (typeof revenue === "object") {
    const obj = revenue as Record<string, unknown>;
    const candidate = obj.gross ?? obj.total ?? obj.gross_revenue ?? obj.amount;
    if (typeof candidate === "number") return candidate;
    if (candidate != null && !Number.isNaN(Number(candidate))) return Number(candidate);
  }
  return null;
}

/** Parse an epoch-ms (number/string) or ISO date into a Date. */
export function toDate(value: unknown): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const asNum = Number(value);
  if (!Number.isNaN(asNum) && String(value).length >= 10) return new Date(asNum);
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}
