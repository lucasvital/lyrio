import { db } from "@/lib/db/client";
import { rcOverview, revenuecatSubscriber } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { ensureAppUser } from "@/lib/identity";
import { syncLogger } from "@/lib/logger";
import { getCheckpoint, markError, markOk, markRunning } from "@/lib/sync/sync-state";
import {
  fetchOverviewMetrics,
  listCustomersPage,
  listSubscriptions,
  rcProjectId,
  subscriptionRevenue,
  toDate,
} from "./client";

const SOURCE = "revenuecat" as const;
const MAX_CUSTOMERS_PER_RUN = 200; // 1 enrichment call each; resumes via cursor

export interface SyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: string | null;
  status: "ok" | "error";
  message?: string;
}

/**
 * RevenueCat sync (Story 3.2):
 *  1. Aggregate metrics from /metrics/overview (MRR, active subs/trials, revenue)
 *     — matches the RevenueCat dashboard, one cheap call.
 *  2. Customer list (identity for the unified join) — paginated, list-only.
 *
 * Per-customer purchase/entitlement enrichment is intentionally NOT done here:
 * with mostly-free customer bases it is prohibitively slow and the aggregate
 * metrics already provide revenue/subscription KPIs.
 */
export async function syncRevenueCat(): Promise<SyncResult> {
  const log = syncLogger(SOURCE);

  try {
    await ensureSchema();
    await markRunning(SOURCE);

    // 1. Aggregate overview metrics
    const ov = await fetchOverviewMetrics();
    await db
      .insert(rcOverview)
      .values({
        projectId: rcProjectId(),
        activeTrials: ov.activeTrials,
        activeSubscriptions: ov.activeSubscriptions,
        mrr: String(ov.mrr),
        revenue28d: String(ov.revenue28d),
        newCustomers28d: ov.newCustomers28d,
        activeUsers28d: ov.activeUsers28d,
        raw: ov.raw,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: rcOverview.projectId,
        set: {
          activeTrials: ov.activeTrials,
          activeSubscriptions: ov.activeSubscriptions,
          mrr: String(ov.mrr),
          revenue28d: String(ov.revenue28d),
          newCustomers28d: ov.newCustomers28d,
          activeUsers28d: ov.activeUsers28d,
          raw: ov.raw,
          updatedAt: new Date(),
        },
      });

    // 2. Customer list (identity for unified join)
    const checkpoint = await getCheckpoint(SOURCE);
    let nextPath: string | null = checkpoint?.cursor ?? null;
    let processed = 0;

    while (processed < MAX_CUSTOMERS_PER_RUN) {
      const { customers, nextPage } = await listCustomersPage(nextPath);
      if (customers.length === 0) {
        nextPath = nextPage;
        break;
      }
      for (const c of customers) {
        await ensureAppUser(c.id, { seenAt: toDate(c.first_seen_at) ?? new Date() });

        // Per-customer enrichment from subscriptions (one call): the subscription
        // object is authoritative — `gives_access` for active status,
        // `total_revenue_in_usd.gross` for lifetime spend.
        let totalSpent = 0;
        let isActive = false;
        const products: string[] = [];
        try {
          const subs = await listSubscriptions(c.id);
          for (const s of subs) {
            totalSpent += subscriptionRevenue(s);
            if (s.gives_access === true) {
              isActive = true;
              if (typeof s.product_id === "string") products.push(s.product_id);
            }
          }
        } catch (e) {
          log.warn({ customer: c.id, err: String(e) }, "subscriptions fetch failed");
        }

        await db
          .insert(revenuecatSubscriber)
          .values({
            appUserId: c.id,
            isActive,
            activeEntitlements: products,
            totalSpentUsd: String(totalSpent),
            originalPurchaseAt: toDate(c.first_seen_at),
            raw: c as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: revenuecatSubscriber.appUserId,
            set: {
              isActive,
              activeEntitlements: products,
              totalSpentUsd: String(totalSpent),
              updatedAt: new Date(),
            },
          });
        processed++;
      }
      nextPath = nextPage;
      if (!nextPath) break;
      if (processed >= MAX_CUSTOMERS_PER_RUN) break;
    }

    await markOk(SOURCE, nextPath ?? null, processed);
    log.info({ overview: ov, customers: processed }, "revenuecat sync ok");
    return { source: SOURCE, ingested: processed, cursor: nextPath ?? null, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "revenuecat sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", message };
  }
}
