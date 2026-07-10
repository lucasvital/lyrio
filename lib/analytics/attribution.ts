import { sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db/client";
import type { Influencer } from "@/lib/db/schema";

/**
 * Attribution analytics (mobile UTM audit + influencer commissions).
 *
 * Origin is resolved with a fixed priority so a manual audit always wins over a
 * guess:
 *   1. manual influencer (someone audited it)
 *   2. coupon code -> influencer (coupon codes are registered per influencer)
 *   3. manual free-text source
 *   4. auto-extracted first-touch source
 *   5. unknown (needs manual attribution)
 */

/** Correlated subquery: the influencer whose registered coupon codes contain a user's coupon. */
const couponInfluencer = (alias: string) => sql.raw(`
  (SELECT i.id FROM influencer i
    WHERE ${alias}.coupon_code IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements_text(i.coupon_codes) AS cc(code)
        WHERE lower(cc.code) = lower(${alias}.coupon_code)
      )
    LIMIT 1)
`);

export type ResolutionMethod =
  | "influencer" // manually attributed to an influencer
  | "coupon" // resolved via a registered coupon code
  | "manual" // manual free-text source
  | "auto" // auto-extracted first-touch source
  | "none"; // unresolved

export interface PayerAttribution {
  id: string;
  email: string | null;
  spent: number;
  isActive: boolean;
  firstPurchaseAt: string | null;
  entitlements: string[] | null;
  firstTouchAt: string | null;
  firstEvent: string | null;
  autoSource: string | null;
  autoMedium: string | null;
  autoCampaign: string | null;
  autoReferrer: string | null;
  autoReferringDomain: string | null;
  autoUrl: string | null;
  autoNetwork: string | null;
  couponCode: string | null;
  manualInfluencerId: string | null;
  manualInfluencerName: string | null;
  couponInfluencerId: string | null;
  couponInfluencerName: string | null;
  manualSource: string | null;
  note: string | null;
  attributedBy: string | null;
  attributedAt: string | null;
  resolvedLabel: string;
  resolvedMethod: ResolutionMethod;
}

export interface PayerFilters {
  payersOnly?: boolean; // default true — spent > 0
  unattributedOnly?: boolean; // needs manual audit
  search?: string; // email / id / coupon
  limit?: number;
  offset?: number;
}

function resolve(row: {
  manual_influencer_id: string | null;
  manual_influencer_name: string | null;
  coupon_influencer_id: string | null;
  coupon_influencer_name: string | null;
  manual_source: string | null;
  coupon_code: string | null;
  auto_source: string | null;
}): { label: string; method: ResolutionMethod } {
  if (row.manual_influencer_id) {
    return { label: row.manual_influencer_name ?? row.manual_influencer_id, method: "influencer" };
  }
  if (row.coupon_influencer_id) {
    return { label: row.coupon_influencer_name ?? row.coupon_influencer_id, method: "coupon" };
  }
  if (row.manual_source) return { label: row.manual_source, method: "manual" };
  if (row.coupon_code) return { label: `cupom: ${row.coupon_code}`, method: "coupon" };
  if (row.auto_source) return { label: row.auto_source, method: "auto" };
  return { label: "—", method: "none" };
}

/** Paying / coupon customers with resolved acquisition origin, for manual audit. */
export async function getPayersWithAttribution(
  filters: PayerFilters = {},
): Promise<PayerAttribution[]> {
  const { payersOnly = true, unattributedOnly = false, search, limit = 200, offset = 0 } =
    filters;

  const conditions: SQL[] = [];
  if (payersOnly) conditions.push(sql`coalesce(r.total_spent_usd, 0) > 0`);
  if (unattributedOnly) {
    conditions.push(
      sql`ua.manual_influencer_id IS NULL AND ua.manual_source IS NULL AND ci.id IS NULL`,
    );
  }
  if (search && search.trim()) {
    const q = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      sql`(lower(u.id) LIKE ${q} OR lower(coalesce(u.email, '')) LIKE ${q} OR lower(coalesce(ua.coupon_code, '')) LIKE ${q})`,
    );
  }
  const where =
    conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;

  const rows = await db.execute<{
    id: string;
    email: string | null;
    spent: number;
    is_active: boolean;
    first_purchase_at: string | null;
    entitlements: string[] | null;
    first_touch_at: string | null;
    first_event: string | null;
    auto_source: string | null;
    auto_medium: string | null;
    auto_campaign: string | null;
    auto_referrer: string | null;
    auto_referring_domain: string | null;
    auto_url: string | null;
    auto_network: string | null;
    coupon_code: string | null;
    manual_influencer_id: string | null;
    manual_influencer_name: string | null;
    coupon_influencer_id: string | null;
    coupon_influencer_name: string | null;
    manual_source: string | null;
    note: string | null;
    attributed_by: string | null;
    attributed_at: string | null;
  }>(sql`
    SELECT
      u.id,
      u.email,
      coalesce(r.total_spent_usd, 0)::float AS spent,
      r.is_active,
      to_char(r.original_purchase_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS first_purchase_at,
      r.active_entitlements AS entitlements,
      to_char(ua.first_touch_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS first_touch_at,
      ua.first_event,
      ua.auto_source, ua.auto_medium, ua.auto_campaign,
      ua.auto_referrer, ua.auto_referring_domain, ua.auto_url, ua.auto_network,
      ua.coupon_code,
      ua.manual_influencer_id,
      im.name AS manual_influencer_name,
      ci.id AS coupon_influencer_id,
      ci.name AS coupon_influencer_name,
      ua.manual_source, ua.note, ua.attributed_by,
      to_char(ua.attributed_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS attributed_at
    FROM revenuecat_subscriber r
    JOIN app_user u ON u.id = r.app_user_id
    LEFT JOIN user_attribution ua ON ua.app_user_id = r.app_user_id
    LEFT JOIN influencer im ON im.id = ua.manual_influencer_id
    LEFT JOIN LATERAL (
      SELECT i.id, i.name FROM influencer i
      WHERE ua.coupon_code IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements_text(i.coupon_codes) AS cc(code)
          WHERE lower(cc.code) = lower(ua.coupon_code)
        )
      LIMIT 1
    ) ci ON true
    ${where}
    ORDER BY spent DESC NULLS LAST, ua.first_touch_at DESC NULLS LAST
    LIMIT ${limit} OFFSET ${offset}
  `);

  return rows.map((r) => {
    const { label, method } = resolve(r);
    return {
      id: r.id,
      email: r.email,
      spent: r.spent,
      isActive: r.is_active,
      firstPurchaseAt: r.first_purchase_at,
      entitlements: r.entitlements,
      firstTouchAt: r.first_touch_at,
      firstEvent: r.first_event,
      autoSource: r.auto_source,
      autoMedium: r.auto_medium,
      autoCampaign: r.auto_campaign,
      autoReferrer: r.auto_referrer,
      autoReferringDomain: r.auto_referring_domain,
      autoUrl: r.auto_url,
      autoNetwork: r.auto_network,
      couponCode: r.coupon_code,
      manualInfluencerId: r.manual_influencer_id,
      manualInfluencerName: r.manual_influencer_name,
      couponInfluencerId: r.coupon_influencer_id,
      couponInfluencerName: r.coupon_influencer_name,
      manualSource: r.manual_source,
      note: r.note,
      attributedBy: r.attributed_by,
      attributedAt: r.attributed_at,
      resolvedLabel: label,
      resolvedMethod: method,
    };
  });
}

export interface InfluencerCommission {
  id: string;
  name: string;
  handle: string | null;
  platform: string | null;
  commissionRate: number;
  sales: number; // paying customers attributed
  attributedUsers: number; // incl. free/coupon
  revenue: number;
  commission: number;
}

/** Per-influencer sales & commission owed (revenue × rate). */
export async function getInfluencerCommissions(): Promise<InfluencerCommission[]> {
  const rows = await db.execute<{
    id: string;
    name: string;
    handle: string | null;
    platform: string | null;
    rate: number;
    sales: number;
    attributed_users: number;
    revenue: number;
    commission: number;
  }>(sql`
    WITH resolved AS (
      SELECT
        coalesce(r.total_spent_usd, 0)::float AS spent,
        coalesce(ua.manual_influencer_id, ${couponInfluencer("ua")}) AS influencer_id
      FROM revenuecat_subscriber r
      LEFT JOIN user_attribution ua ON ua.app_user_id = r.app_user_id
    )
    SELECT
      i.id, i.name, i.handle, i.platform,
      i.commission_rate::float AS rate,
      count(*) FILTER (WHERE res.spent > 0)::int AS sales,
      count(res.influencer_id)::int AS attributed_users,
      coalesce(sum(res.spent), 0)::float AS revenue,
      (coalesce(sum(res.spent), 0) * i.commission_rate)::float AS commission
    FROM influencer i
    LEFT JOIN resolved res ON res.influencer_id = i.id
    GROUP BY i.id, i.name, i.handle, i.platform, i.commission_rate
    ORDER BY revenue DESC, i.name ASC
  `);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    platform: r.platform,
    commissionRate: r.rate,
    sales: r.sales,
    attributedUsers: r.attributed_users,
    revenue: r.revenue,
    commission: r.commission,
  }));
}

export interface AttributionSummary {
  totalPayers: number;
  attributedPayers: number;
  unattributedPayers: number;
  totalRevenue: number;
  totalCommission: number;
}

/** Top-line KPIs for the attribution dashboard. */
export async function getAttributionSummary(): Promise<AttributionSummary> {
  const rows = await db.execute<{
    total_payers: number;
    attributed_payers: number;
    unattributed_payers: number;
    total_revenue: number;
    total_commission: number;
  }>(sql`
    WITH resolved AS (
      SELECT
        coalesce(r.total_spent_usd, 0)::float AS spent,
        coalesce(ua.manual_influencer_id, ${couponInfluencer("ua")}) AS influencer_id,
        ua.manual_source
      FROM revenuecat_subscriber r
      LEFT JOIN user_attribution ua ON ua.app_user_id = r.app_user_id
    ),
    payers AS (SELECT * FROM resolved WHERE spent > 0)
    SELECT
      (SELECT count(*) FROM payers)::int AS total_payers,
      (SELECT count(*) FROM payers WHERE influencer_id IS NOT NULL OR manual_source IS NOT NULL)::int AS attributed_payers,
      (SELECT count(*) FROM payers WHERE influencer_id IS NULL AND manual_source IS NULL)::int AS unattributed_payers,
      (SELECT coalesce(sum(spent), 0) FROM payers)::float AS total_revenue,
      (SELECT coalesce(sum(res.spent * i.commission_rate), 0)
         FROM resolved res JOIN influencer i ON i.id = res.influencer_id)::float AS total_commission
  `);
  const r = rows[0] ?? {
    total_payers: 0,
    attributed_payers: 0,
    unattributed_payers: 0,
    total_revenue: 0,
    total_commission: 0,
  };
  return {
    totalPayers: r.total_payers,
    attributedPayers: r.attributed_payers,
    unattributedPayers: r.unattributed_payers,
    totalRevenue: r.total_revenue,
    totalCommission: r.total_commission,
  };
}

/** All influencers (for the manage UI and attribution dropdowns). */
export async function listInfluencers(): Promise<Influencer[]> {
  const rows = await db.execute<{
    id: string;
    name: string;
    handle: string | null;
    platform: string | null;
    coupon_codes: string[];
    commission_rate: string;
    notes: string | null;
    created_at: string;
  }>(sql`SELECT * FROM influencer ORDER BY name ASC`);
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    handle: r.handle,
    platform: r.platform,
    couponCodes: r.coupon_codes ?? [],
    commissionRate: r.commission_rate,
    notes: r.notes,
    createdAt: new Date(r.created_at),
  }));
}
