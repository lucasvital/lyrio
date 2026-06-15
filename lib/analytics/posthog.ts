import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ProductKpis {
  activeUsers: number;
  totalEvents: number;
  eventsPerUser: number;
}

export async function getProductKpis(range: DateRange): Promise<ProductKpis> {
  const rows = await db.execute<{ active_users: number; total_events: number }>(sql`
    SELECT
      count(DISTINCT distinct_id)::int AS active_users,
      count(*)::int AS total_events
    FROM posthog_event
    WHERE timestamp >= ${range.from.toISOString()} AND timestamp < ${range.to.toISOString()}
  `);
  const row = rows[0] ?? { active_users: 0, total_events: 0 };
  return {
    activeUsers: row.active_users,
    totalEvents: row.total_events,
    eventsPerUser: row.active_users > 0 ? row.total_events / row.active_users : 0,
  };
}

export interface DailyPoint {
  date: string;
  events: number;
  users: number;
}

export async function getDailyActivity(range: DateRange): Promise<DailyPoint[]> {
  const rows = await db.execute<{ date: string; events: number; users: number }>(sql`
    SELECT
      to_char(date_trunc('day', timestamp), 'YYYY-MM-DD') AS date,
      count(*)::int AS events,
      count(DISTINCT distinct_id)::int AS users
    FROM posthog_event
    WHERE timestamp >= ${range.from.toISOString()} AND timestamp < ${range.to.toISOString()}
    GROUP BY 1
    ORDER BY 1
  `);
  return rows.map((r) => ({ date: r.date, events: r.events, users: r.users }));
}

export interface TopEvent {
  event: string;
  count: number;
}

export async function getTopEvents(range: DateRange, limit = 10): Promise<TopEvent[]> {
  const rows = await db.execute<{ event: string; count: number }>(sql`
    SELECT event, count(*)::int AS count
    FROM posthog_event
    WHERE timestamp >= ${range.from.toISOString()} AND timestamp < ${range.to.toISOString()}
    GROUP BY event
    ORDER BY count DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({ event: r.event, count: r.count }));
}
