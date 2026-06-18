import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface KiwifyKpis {
  active: number;
  canceled: number;
  late: number;
  total: number;
  mrr: number;
}

export async function getKiwifyKpis(): Promise<KiwifyKpis> {
  const rows = await db.execute<{
    active: number;
    canceled: number;
    late: number;
    total: number;
    mrr: number;
  }>(sql`
    SELECT
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'canceled')::int AS canceled,
      count(*) FILTER (WHERE status = 'late')::int AS late,
      count(*)::int AS total,
      coalesce(sum(amount) FILTER (WHERE status = 'active'), 0)::float AS mrr
    FROM kiwify_subscription
  `);
  const r = rows[0] ?? { active: 0, canceled: 0, late: 0, total: 0, mrr: 0 };
  return { active: r.active, canceled: r.canceled, late: r.late, total: r.total, mrr: r.mrr };
}

export interface KiwifyProjectRow {
  project: string;
  active: number;
  canceled: number;
  total: number;
}

export async function getKiwifyByProject(): Promise<KiwifyProjectRow[]> {
  const rows = await db.execute<{
    project: string;
    active: number;
    canceled: number;
    total: number;
  }>(sql`
    SELECT
      project,
      count(*) FILTER (WHERE status = 'active')::int AS active,
      count(*) FILTER (WHERE status = 'canceled')::int AS canceled,
      count(*)::int AS total
    FROM kiwify_subscription
    GROUP BY project
    ORDER BY active DESC, total DESC
  `);
  return rows.map((r) => ({
    project: r.project,
    active: r.active,
    canceled: r.canceled,
    total: r.total,
  }));
}

export interface KiwifyEventRow {
  project: string;
  eventType: string | null;
  subscriptionId: string | null;
  receivedAt: string | null;
}

export async function getRecentKiwifyEvents(limit = 15): Promise<KiwifyEventRow[]> {
  const rows = await db.execute<{
    project: string;
    event_type: string | null;
    subscription_id: string | null;
    received_at: string | null;
  }>(sql`
    SELECT project, event_type,
      subscription_id,
      to_char(received_at, 'YYYY-MM-DD"T"HH24:MI:SSZ') AS received_at
    FROM kiwify_event
    ORDER BY received_at DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    project: r.project,
    eventType: r.event_type,
    subscriptionId: r.subscription_id,
    receivedAt: r.received_at,
  }));
}
