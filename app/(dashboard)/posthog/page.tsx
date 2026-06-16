import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { TimeSeries } from "@/components/charts/time-series";
import { Funnel } from "@/components/charts/funnel";
import { EmptyState } from "@/components/empty-state";
import { SyncStatus } from "@/components/sync-status";
import { parseRange } from "@/lib/analytics/range";
import { safeQuery } from "@/lib/analytics/safe";
import { getDailyActivity, getProductKpis, getTopEvents } from "@/lib/analytics/posthog";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PostHogPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);

  const [kpis, daily, topEvents] = await Promise.all([
    safeQuery(() => getProductKpis(range), { activeUsers: 0, totalEvents: 0, eventsPerUser: 0 }),
    safeQuery(() => getDailyActivity(range), []),
    safeQuery(() => getTopEvents(range), []),
  ]);

  return (
    <>
      <PageHeader title="PostHog" description="Product behavior analytics">
        <SyncStatus source="posthog" />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Active users" value={formatNumber(kpis.activeUsers)} />
        <KpiCard label="Total events" value={formatNumber(kpis.totalEvents)} />
        <KpiCard label="Events / user" value={formatNumber(kpis.eventsPerUser)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Daily activity</CardTitle>
          <div className="mt-3">
            <TimeSeries
              data={daily}
              series={[
                { key: "events", label: "Events", color: "#818cf8" },
                { key: "users", label: "Users", color: "#4ade80" },
              ]}
            />
          </div>
        </Card>
        <Card>
          <CardTitle>Top events</CardTitle>
          <div className="mt-3">
            {topEvents.length > 0 ? (
              <Funnel
                showRate={false}
                steps={topEvents.map((e) => ({ label: e.event, value: e.count }))}
              />
            ) : (
              <EmptyState title="No events yet" hint="Run a PostHog sync to populate." />
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
