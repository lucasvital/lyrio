import { logger } from "@/lib/logger";

/**
 * Run an analytics query, returning a fallback if the DB is unavailable or
 * credentials/migrations are not yet in place. Keeps dashboards from crashing
 * before first sync (graceful degradation).
 */
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "analytics query failed");
    return fallback;
  }
}
