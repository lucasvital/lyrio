/**
 * Mobile UTM / acquisition attribution — signal extraction.
 *
 * Mobile attribution is unreliable: UTMs are often absent (Apple restrictions)
 * and, when present, arrive under inconsistent keys depending on the SDK and the
 * event (`install_attributed`, `Deep Link Opened`, `$pageview`, ...). Instead of
 * trusting one key, we scan a broad, priority-ordered set of candidate property
 * names across ALL of a user's events and keep the earliest (first-touch)
 * non-empty value. Whatever we cannot resolve automatically is surfaced raw in
 * `signals` for manual audit.
 */

/**
 * Priority-ordered candidate property keys per canonical output column. The
 * first non-empty value (by earliest event timestamp) wins.
 */
export const ATTRIBUTION_KEYS: Record<string, string[]> = {
  auto_source: [
    "utm_source",
    "$initial_utm_source",
    "media_source",
    "network",
    "network_name",
    "source",
  ],
  auto_medium: ["utm_medium", "$initial_utm_medium", "medium", "channel"],
  auto_campaign: [
    "utm_campaign",
    "$initial_utm_campaign",
    "campaign",
    "campaign_name",
  ],
  auto_content: ["utm_content", "$initial_utm_content", "adgroup", "ad_group", "creative"],
  auto_term: ["utm_term", "$initial_utm_term", "keyword"],
  auto_referrer: ["$referrer", "$initial_referrer", "referrer"],
  auto_referring_domain: ["$referring_domain", "$initial_referring_domain"],
  auto_url: [
    "$current_url",
    "$initial_current_url",
    "$deep_link_url",
    "deep_link_url",
    "url",
  ],
  auto_network: ["network", "network_name", "media_source"],
};

/** All distinct property keys we scan (for the raw `signals` audit bag). */
export const SIGNAL_KEYS: string[] = Array.from(
  new Set(Object.values(ATTRIBUTION_KEYS).flat()),
);

/**
 * Build a SQL expression that returns the earliest non-empty value of a jsonb
 * property key across the grouped events. Keys are hardcoded constants (no user
 * input), so raw interpolation is safe.
 */
function earliestNonNull(key: string): string {
  const k = key.replace(/'/g, "''");
  return `(array_agg(properties->>'${k}' ORDER BY timestamp ASC) FILTER (WHERE nullif(properties->>'${k}', '') IS NOT NULL))[1]`;
}

/** `coalesce(...)` of the earliest-non-null expression for each candidate key. */
export function columnExpr(outputColumn: string): string {
  const keys = ATTRIBUTION_KEYS[outputColumn];
  if (!keys) throw new Error(`Unknown attribution column: ${outputColumn}`);
  return `coalesce(${keys.map(earliestNonNull).join(", ")})`;
}
