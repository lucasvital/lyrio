import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { posthogEvent } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { ensureAppUser } from "@/lib/identity";
import { syncLogger } from "@/lib/logger";
import { getCheckpoint, markError, markOk, markRunning } from "@/lib/sync/sync-state";
import { fetchEventsPage } from "./client";

const SOURCE = "posthog" as const;
const MAX_PAGES_PER_RUN = 20;

export interface SyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: string | null;
  status: "ok" | "error";
  message?: string;
}

/**
 * Incremental, idempotent ingest of PostHog events (Story 2.2).
 * Upserts by event id; advances cursor only on success.
 */
export async function syncPostHog(): Promise<SyncResult> {
  const log = syncLogger(SOURCE);
  try {
    await ensureSchema();
    await markRunning(SOURCE);

    // Backfill canonical user_id for legacy rows (resolve identified id when
    // available) and seed app_user with those canonical ids. Cheap after the
    // first pass (only touches rows where user_id is still NULL).
    await db.execute(
      sql`UPDATE posthog_event SET user_id = coalesce(nullif(properties->>'$user_id', ''), distinct_id) WHERE user_id IS NULL`,
    );
    await db.execute(
      sql`INSERT INTO app_user (id) SELECT DISTINCT user_id FROM posthog_event WHERE user_id IS NOT NULL ON CONFLICT (id) DO NOTHING`,
    );

    const checkpoint = await getCheckpoint(SOURCE);
    let after = checkpoint?.cursor ?? null;
    let next: string | null = null;
    let ingested = 0;
    let latestTs = after;

    for (let page = 0; page < MAX_PAGES_PER_RUN; page++) {
      const { events, next: nextUrl } = await fetchEventsPage({ after, next });
      if (events.length === 0) break;

      for (const ev of events) {
        const rawUserId = ev.properties?.["$user_id"];
        const userId =
          typeof rawUserId === "string" && rawUserId.length > 0
            ? rawUserId
            : ev.distinct_id;
        await ensureAppUser(userId, { seenAt: new Date(ev.timestamp) });
        await db
          .insert(posthogEvent)
          .values({
            eventId: ev.id,
            distinctId: ev.distinct_id,
            userId,
            event: ev.event,
            timestamp: new Date(ev.timestamp),
            properties: ev.properties,
          })
          .onConflictDoNothing({ target: posthogEvent.eventId });
        ingested++;
        if (!latestTs || ev.timestamp > latestTs) latestTs = ev.timestamp;
      }

      next = nextUrl;
      after = null; // once paginating via `next`, stop using `after`
      if (!next) break;
    }

    await markOk(SOURCE, latestTs ?? after, ingested);
    log.info({ ingested }, "posthog sync ok");
    return { source: SOURCE, ingested, cursor: latestTs ?? after, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "posthog sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", message };
  }
}
