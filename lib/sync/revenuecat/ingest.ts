import { db } from "@/lib/db/client";
import { revenuecatTransaction, revenuecatSubscriber } from "@/lib/db/schema";
import { ensureAppUser } from "@/lib/identity";
import { syncLogger } from "@/lib/logger";
import { getCheckpoint, markError, markOk, markRunning } from "@/lib/sync/sync-state";
import { fetchTransactionsPage } from "./client";

const SOURCE = "revenuecat" as const;
const MAX_PAGES_PER_RUN = 20;

export interface SyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: string | null;
  status: "ok" | "error";
  message?: string;
}

/**
 * Incremental, idempotent ingest of RevenueCat transactions (Story 3.2).
 * Upserts transactions by id and maintains a subscriber summary row.
 */
export async function syncRevenueCat(): Promise<SyncResult> {
  const log = syncLogger(SOURCE);
  await markRunning(SOURCE);

  try {
    const checkpoint = await getCheckpoint(SOURCE);
    let startingAfter = checkpoint?.cursor ?? null;
    let nextPage: string | null = null;
    let ingested = 0;
    let lastId = startingAfter;

    for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
      const { transactions, nextPage: np } = await fetchTransactionsPage({
        startingAfter,
        nextPage,
      });
      if (transactions.length === 0) break;

      for (const tx of transactions) {
        await ensureAppUser(tx.app_user_id, { seenAt: new Date(tx.purchased_at) });

        await db
          .insert(revenuecatTransaction)
          .values({
            transactionId: tx.id,
            appUserId: tx.app_user_id,
            productId: tx.product_id ?? null,
            store: tx.store ?? null,
            type: tx.type ?? null,
            priceUsd: tx.revenue_in_usd != null ? String(tx.revenue_in_usd) : null,
            currency: tx.currency ?? null,
            purchasedAt: new Date(tx.purchased_at),
            raw: tx as unknown as Record<string, unknown>,
          })
          .onConflictDoNothing({ target: revenuecatTransaction.transactionId });

        await db
          .insert(revenuecatSubscriber)
          .values({
            appUserId: tx.app_user_id,
            isActive: true,
            originalPurchaseAt: new Date(tx.purchased_at),
          })
          .onConflictDoUpdate({
            target: revenuecatSubscriber.appUserId,
            set: { isActive: true },
          });

        ingested++;
        lastId = tx.id;
      }

      nextPage = np;
      startingAfter = null;
      if (!nextPage) break;
    }

    await markOk(SOURCE, lastId, ingested);
    log.info({ ingested }, "revenuecat sync ok");
    return { source: SOURCE, ingested, cursor: lastId, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "revenuecat sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", message };
  }
}
