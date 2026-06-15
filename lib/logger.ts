import pino from "pino";

/** Structured logger (coding-standards: structured logs with a `source` field). */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
});

export type SyncSource = "posthog" | "revenuecat";

export function syncLogger(source: SyncSource) {
  return logger.child({ source });
}
