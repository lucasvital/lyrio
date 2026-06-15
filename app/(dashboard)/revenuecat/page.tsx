import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { TimeSeries } from "@/components/charts/time-series";
import { SyncStatus } from "@/components/sync-status";
import { parseRange } from "@/lib/analytics/range";
import { safeQuery } from "@/lib/analytics/safe";
import { getDailyRevenue, getRevenueKpis } from "@/lib/analytics/revenuecat";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevenueCatPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);

  const [kpis, daily] = await Promise.all([
    safeQuery(() => getRevenueKpis(range), {
      revenue: 0,
      transactions: 0,
      payingUsers: 0,
      activeSubscribers: 0,
      arpu: 0,
    }),
    safeQuery(() => getDailyRevenue(range), []),
  ]);

  return (
    <>
      <PageHeader title="RevenueCat" description="Subscription & revenue analytics">
        <SyncStatus source="revenuecat" />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={formatCurrency(kpis.revenue)} />
        <KpiCard label="Active subscribers" value={formatNumber(kpis.activeSubscribers)} />
        <KpiCard label="Paying users" value={formatNumber(kpis.payingUsers)} />
        <KpiCard label="ARPU" value={formatCurrency(kpis.arpu)} />
      </div>

      <div className="mt-4">
        <Card>
          <CardTitle>Daily revenue</CardTitle>
          <div className="mt-3">
            <TimeSeries
              data={daily}
              series={[{ key: "revenue", label: "Revenue (USD)", color: "#4ade80" }]}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
