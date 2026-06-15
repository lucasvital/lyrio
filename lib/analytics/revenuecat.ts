import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { rcOverview } from "@/lib/db/schema";
import type { DateRange } from "./posthog";

export interface RevenueOverview {
  mrr: number;
  revenue28d: number;
  activeSubscriptions: number;
  activeTrials: number;
  newCustomers28d: number;
  activeUsers28d: number;
  updatedAt: Date | null;
}

/** Aggregate RevenueCat metrics snapshot (from /metrics/overview). */
export async function getRevenueOverview(): Promise<RevenueOverview> {
  const rows = await db.select().from(rcOverview).limit(1);
  const r = rows[0];
  return {
    mrr: Number(r?.mrr ?? 0),
    revenue28d: Number(r?.revenue28d ?? 0),
    activeSubscriptions: r?.activeSubscriptions ?? 0,
    activeTrials: r?.activeTrials ?? 0,
    newCustomers28d: r?.newCustomers28d ?? 0,
    activeUsers28d: r?.activeUsers28d ?? 0,
    updatedAt: r?.updatedAt ?? null,
  };
}

export interface RevenueKpis {
  revenue: number;
  transactions: number;
  payingUsers: number;
  activeSubscribers: number;
  arpu: number;
}

export async function getRevenueKpis(range: DateRange): Promise<RevenueKpis> {
  const rev = await db.execute<{
    revenue: number;
    transactions: number;
    paying_users: number;
  }>(sql`
    SELECT
      coalesce(sum(price_usd), 0)::float AS revenue,
      count(*)::int AS transactions,
      count(DISTINCT app_user_id)::int AS paying_users
    FROM revenuecat_transaction
    WHERE purchased_at >= ${range.from.toISOString()} AND purchased_at < ${range.to.toISOString()}
  `);

  const subs = await db.execute<{ active: number }>(sql`
    SELECT count(*)::int AS active FROM revenuecat_subscriber WHERE is_active = true
  `);

  const r = rev[0] ?? { revenue: 0, transactions: 0, paying_users: 0 };
  const active = subs[0]?.active ?? 0;
  return {
    revenue: r.revenue,
    transactions: r.transactions,
    payingUsers: r.paying_users,
    activeSubscribers: active,
    arpu: r.paying_users > 0 ? r.revenue / r.paying_users : 0,
  };
}

export interface RevenuePoint {
  date: string;
  revenue: number;
}

export async function getDailyRevenue(range: DateRange): Promise<RevenuePoint[]> {
  const rows = await db.execute<{ date: string; revenue: number }>(sql`
    SELECT
      to_char(date_trunc('day', purchased_at), 'YYYY-MM-DD') AS date,
      coalesce(sum(price_usd), 0)::float AS revenue
    FROM revenuecat_transaction
    WHERE purchased_at >= ${range.from.toISOString()} AND purchased_at < ${range.to.toISOString()}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({ date: r.date, revenue: r.revenue }));
}
