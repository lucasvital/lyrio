import { db } from "@/lib/db/client";
import { revenuecatTransaction, revenuecatSubscriber } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { ensureAppUser } from "@/lib/identity";
import { syncLogger } from "@/lib/logger";
import { getCheckpoint, markError, markOk, markRunning } from "@/lib/sync/sync-state";
import {
  grossUsd,
  listActiveEntitlements,
  listCustomerPurchases,
  listCustomersPage,
  toDate,
} from "./client";

const SOURCE = "revenuecat" as const;
const MAX_CUSTOMERS_PER_RUN = 150; // bounded per run; resumes via cursor

export interface SyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: string | null;
  status: "ok" | "error";
  message?: string;
}

/**
 * Incremental ingest of RevenueCat customers + purchases (Story 3.2), via the
 * v2 API. Idempotent (upsert by natural id). The cursor is the customers
 * `next_page`; when exhausted it resets to re-scan (refreshing data).
 */
export async function syncRevenueCat(): Promise<SyncResult> {
  const log = syncLogger(SOURCE);

  try {
    await ensureSchema();
    await markRunning(SOURCE);

    const checkpoint = await getCheckpoint(SOURCE);
    let nextPath: string | null = checkpoint?.cursor ?? null;
    let customersProcessed = 0;
    let ingested = 0;

    while (customersProcessed < MAX_CUSTOMERS_PER_RUN) {
      const { customers, nextPage } = await listCustomersPage(nextPath);
      if (customers.length === 0) {
        nextPath = nextPage;
        break;
      }

      for (const c of customers) {
        const seenAt = toDate(c.first_seen_at) ?? new Date();
        await ensureAppUser(c.id, { seenAt });

        // Active status comes from the dedicated active_entitlements endpoint
        // (the customers list does not populate them reliably).
        let entitlements: string[] = [];
        try {
          entitlements = await listActiveEntitlements(c.id);
        } catch (e) {
          log.warn(
            { customer: c.id, err: e instanceof Error ? e.message : String(e) },
            "active_entitlements fetch failed",
          );
        }

        await db
          .insert(revenuecatSubscriber)
          .values({
            appUserId: c.id,
            isActive: entitlements.length > 0,
            activeEntitlements: entitlements,
            originalPurchaseAt: toDate(c.first_seen_at),
            raw: c as Record<string, unknown>,
          })
          .onConflictDoUpdate({
            target: revenuecatSubscriber.appUserId,
            set: {
              isActive: entitlements.length > 0,
              activeEntitlements: entitlements,
              updatedAt: new Date(),
            },
          });

        // Purchases → transactions (revenue)
        const purchases = await listCustomerPurchases(c.id);
        for (const p of purchases) {
          const purchasedAt = toDate(p.purchased_at);
          if (!purchasedAt) continue;
          const price = grossUsd(p.revenue_in_usd);
          await db
            .insert(revenuecatTransaction)
            .values({
              transactionId: p.id,
              appUserId: c.id,
              productId: p.product_id ?? null,
              store: p.store ?? null,
              type: null,
              priceUsd: price != null ? String(price) : null,
              currency: "USD",
              purchasedAt,
              raw: p as Record<string, unknown>,
            })
            .onConflictDoNothing({ target: revenuecatTransaction.transactionId });
          ingested++;
        }

        customersProcessed++;
      }

      nextPath = nextPage;
      if (!nextPath) break; // reached the end → cursor resets below
      if (customersProcessed >= MAX_CUSTOMERS_PER_RUN) break;
    }

    await markOk(SOURCE, nextPath ?? null, ingested);
    log.info({ ingested, customersProcessed }, "revenuecat sync ok");
    return { source: SOURCE, ingested, cursor: nextPath ?? null, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "revenuecat sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", message };
  }
}
