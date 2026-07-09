import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { syncLogger } from "@/lib/logger";
import { markError, markOk, markRunning } from "@/lib/sync/sync-state";
import { columnExpr } from "./extract";

const SOURCE = "attribution" as const;

export interface AttributionSyncResult {
  source: typeof SOURCE;
  ingested: number;
  cursor: null;
  status: "ok" | "error";
  message?: string;
}

/** Earliest non-empty coupon code from `courtesy_applied` events. */
const COUPON_EXPR =
  "(array_agg(properties->>'coupon_code' ORDER BY timestamp ASC) FILTER (WHERE event = 'courtesy_applied' AND nullif(properties->>'coupon_code', '') IS NOT NULL))[1]";

/** Earliest raw payload for a given event (kept verbatim for manual audit). */
function firstPayload(event: string): string {
  const e = event.replace(/'/g, "''");
  return `(array_agg(properties ORDER BY timestamp ASC) FILTER (WHERE event = '${e}'))[1]`;
}

/**
 * Extract first-touch acquisition signals for every user from the mirrored
 * PostHog events and upsert them into `user_attribution`. Single grouped pass;
 * re-running only refreshes the auto-extracted fields — manual attribution
 * (influencer, source, note) is preserved via a targeted ON CONFLICT update.
 */
export async function syncAttribution(): Promise<AttributionSyncResult> {
  const log = syncLogger(SOURCE);
  try {
    await ensureSchema();
    await markRunning(SOURCE);

    const src = columnExpr("auto_source");
    const med = columnExpr("auto_medium");
    const camp = columnExpr("auto_campaign");
    const cont = columnExpr("auto_content");
    const term = columnExpr("auto_term");
    const ref = columnExpr("auto_referrer");
    const refDom = columnExpr("auto_referring_domain");
    const url = columnExpr("auto_url");
    const net = columnExpr("auto_network");

    const signals = `jsonb_strip_nulls(jsonb_build_object(
      'auto_source', ${src},
      'auto_medium', ${med},
      'auto_campaign', ${camp},
      'auto_content', ${cont},
      'auto_term', ${term},
      'referrer', ${ref},
      'referring_domain', ${refDom},
      'first_url', ${url},
      'coupon_code', ${COUPON_EXPR},
      'install_attributed', ${firstPayload("install_attributed")},
      'deep_link_opened', ${firstPayload("Deep Link Opened")}
    ))`;

    const statement = `
      INSERT INTO user_attribution (
        app_user_id, first_touch_at, first_event,
        auto_source, auto_medium, auto_campaign, auto_content, auto_term,
        auto_referrer, auto_referring_domain, auto_url, auto_network,
        coupon_code, signals, updated_at
      )
      SELECT
        user_id,
        min(timestamp),
        (array_agg(event ORDER BY timestamp ASC))[1],
        ${src}, ${med}, ${camp}, ${cont}, ${term},
        ${ref}, ${refDom}, ${url}, ${net},
        ${COUPON_EXPR}, ${signals}, now()
      FROM posthog_event
      WHERE user_id IS NOT NULL
      GROUP BY user_id
      ON CONFLICT (app_user_id) DO UPDATE SET
        first_touch_at = excluded.first_touch_at,
        first_event = excluded.first_event,
        auto_source = excluded.auto_source,
        auto_medium = excluded.auto_medium,
        auto_campaign = excluded.auto_campaign,
        auto_content = excluded.auto_content,
        auto_term = excluded.auto_term,
        auto_referrer = excluded.auto_referrer,
        auto_referring_domain = excluded.auto_referring_domain,
        auto_url = excluded.auto_url,
        auto_network = excluded.auto_network,
        coupon_code = excluded.coupon_code,
        signals = excluded.signals,
        updated_at = now()
      RETURNING app_user_id
    `;

    const rows = await db.execute<{ app_user_id: string }>(sql.raw(statement));
    const ingested = rows.length;

    await markOk(SOURCE, null, ingested);
    log.info({ ingested }, "attribution sync ok");
    return { source: SOURCE, ingested, cursor: null, status: "ok" };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await markError(SOURCE, message);
    log.error({ err: message }, "attribution sync failed");
    return { source: SOURCE, ingested: 0, cursor: null, status: "error", message };
  }
}
