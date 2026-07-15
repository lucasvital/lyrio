import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { appUser, posthogEvent } from "@/lib/db/schema";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncLogger } from "@/lib/logger";
import { getCheckpoint, markError, markOk, markRunning } from "@/lib/sync/sync-state";
import { fetchEventsPage } from "./client";

const SOURCE = "posthog" as const;
// Keep pulling pages until the backlog is drained, bounded by a wall-clock
// budget so a single serverless invocation stays under its timeout. `done` tells
// the caller (Settings button / cron) whether to invoke again to continue.
const MAX_RUN_MS = 45_000;

export interface SyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: string | null;
  status: "ok" | "error";
  done: boolean;
  message?: string;
}

/**
 * Incremental + backfill ingest of PostHog events. Idempotent (upsert by event
 * id). Writes are batched per page (one insert for events, one for app_user).
 *
 * Cursor forms (persisted in sync_state.cursor):
 *  - null            → fresh: start from the newest events and paginate back
 *                      through all history via `next`
 *  - ISO timestamp   → caught up: fetch events newer than this (`after`)
 *  - JSON `{n,h}`    → mid-backfill: resume pagination at `n`, carrying the
 *                      high-water timestamp `h` (the newest event seen), so once
 *                      the backfill finishes we switch to incremental from `h`
 *
 * This makes the backfill resumable across invocations: a run that hits the time
 * budget saves the pagination URL and the next run continues where it left off,
 * instead of jumping the cursor to "newest" and skipping the unread history.
 */
export async function syncPostHog(): Promise<SyncResult> {
  const log = syncLogger(SOURCE);
  try {
    await ensureSchema();
    await markRunning(SOURCE);

    const checkpoint = await getCheckpoint(SOURCE);
    const saved = checkpoint?.cursor ?? null;

    let after: string | null = null;
    let next: string | null = null;
    let high: string | null = null; // newest event timestamp seen (incremental high-water)
    if (saved) {
      if (saved.startsWith("{")) {
        try {
          const o = JSON.parse(saved) as { n?: string | null; h?: string | null };
          next = o.n ?? null;
          high = o.h ?? null;
        } catch {
          /* malformed cursor → treat as fresh backfill */
        }
      } else {
        after = saved;
        high = saved;
      }
    }

    let ingested = 0;
    let done = false;
    let lastNext: string | null = null;
    const startedAt = Date.now();

    for (;;) {
      const { events, next: nextUrl } = await fetchEventsPage({ after, next });
      after = null; // once past the first fetch, paginate via `next`
      if (events.length === 0) {
        done = true;
        break;
      }

      // Build de-duplicated batches for the page.
      const eventById = new Map<string, typeof posthogEvent.$inferInsert>();
      const userLatest = new Map<string, Date>();
      for (const ev of events) {
        const rawUserId = ev.properties?.["$user_id"];
        const userId =
          typeof rawUserId === "string" && rawUserId.length > 0
            ? rawUserId
            : ev.distinct_id;
        const ts = new Date(ev.timestamp);
        eventById.set(ev.id, {
          eventId: ev.id,
          distinctId: ev.distinct_id,
          userId,
          event: ev.event,
          timestamp: ts,
          properties: ev.properties,
        });
        const prev = userLatest.get(userId);
        if (!prev || ts > prev) userLatest.set(userId, ts);
        if (!high || ev.timestamp > high) high = ev.timestamp;
      }

      const userRows = Array.from(userLatest.entries()).map(([id, ts]) => ({
        id,
        firstSeenAt: ts,
        lastSeenAt: ts,
      }));
      if (userRows.length > 0) {
        await db
          .insert(appUser)
          .values(userRows)
          .onConflictDoUpdate({
            target: appUser.id,
            set: {
              firstSeenAt: sql`least(${appUser.firstSeenAt}, excluded.first_seen_at)`,
              lastSeenAt: sql`greatest(${appUser.lastSeenAt}, excluded.last_seen_at)`,
            },
          });
      }

      const eventRows = Array.from(eventById.values());
      await db
        .insert(posthogEvent)
        .values(eventRows)
        .onConflictDoNothing({ target: posthogEvent.eventId });
      ingested += eventRows.length;

      next = nextUrl;
      lastNext = nextUrl;
      if (!next) {
        done = true;
        break;
      }
      if (Date.now() - startedAt > MAX_RUN_MS) break; // resume on the next call
    }

    // Backfill canonical user_id for any legacy rows missing it.
    await db.execute(
      sql`UPDATE posthog_event SET user_id = coalesce(nullif(properties->>'$user_id', ''), distinct_id) WHERE user_id IS NULL`,
    );

    // Save cursor: the newest timestamp once fully caught up (→ incremental), or
    // the pagination URL + high-water while a backfill is still in progress.
    const cursorToSave = done ? high : JSON.stringify({ n: lastNext, h: high });
    await markOk(SOURCE, cursorToSave, ingested);
    log.info({ ingested, done }, "posthog sync ok");
    return { source: SOURCE, ingested, cursor: cursorToSave, status: "ok", done };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "posthog sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", done: false, message };
  }
}
