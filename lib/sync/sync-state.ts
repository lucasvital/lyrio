import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { syncState } from "@/lib/db/schema";
import type { SyncSource } from "@/lib/logger";

export async function getCheckpoint(source: SyncSource) {
  const rows = await db
    .select()
    .from(syncState)
    .where(eq(syncState.source, source))
    .limit(1);
  return rows[0] ?? null;
}

export async function markRunning(source: SyncSource) {
  await db
    .insert(syncState)
    .values({ source, status: "running", lastRunAt: new Date() })
    .onConflictDoUpdate({
      target: syncState.source,
      set: { status: "running", lastRunAt: new Date(), error: null },
    });
}

export async function markOk(source: SyncSource, cursor: string | null, ingested: number) {
  const existing = await getCheckpoint(source);
  await db
    .insert(syncState)
    .values({
      source,
      cursor,
      status: "ok",
      lastRunAt: new Date(),
      ingestedTotal: ingested,
    })
    .onConflictDoUpdate({
      target: syncState.source,
      set: {
        cursor,
        status: "ok",
        lastRunAt: new Date(),
        error: null,
        ingestedTotal: (existing?.ingestedTotal ?? 0) + ingested,
      },
    });
}

export async function markError(source: SyncSource, message: string) {
  // NOTE: cursor is intentionally NOT advanced on error.
  await db
    .insert(syncState)
    .values({ source, status: "error", lastRunAt: new Date(), error: message })
    .onConflictDoUpdate({
      target: syncState.source,
      set: { status: "error", lastRunAt: new Date(), error: message },
    });
}
