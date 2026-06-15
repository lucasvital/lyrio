import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { TimeSeries } from "@/components/charts/time-series";
import { SyncStatus } from "@/components/sync-status";
import { safeQuery } from "@/lib/analytics/safe";
import { getChart, getRevenueOverview } from "@/lib/analytics/revenuecat";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevenueCatPage() {
  const [ov, mrr, revenue, actives, trials] = await Promise.all([
    safeQuery(() => getRevenueOverview(), {
      mrr: 0,
      revenue28d: 0,
      activeSubscriptions: 0,
      activeTrials: 0,
      newCustomers28d: 0,
      activeUsers28d: 0,
      updatedAt: null,
    }),
    safeQuery(() => getChart("mrr"), { unit: "$", points: [] }),
    safeQuery(() => getChart("revenue"), { unit: "$", points: [] }),
    safeQuery(() => getChart("actives"), { unit: "#", points: [] }),
    safeQuery(() => getChart("trials"), { unit: "#", points: [] }),
  ]);

  return (
    <>
      <PageHeader title="RevenueCat" description="Subscription & revenue analytics">
        <SyncStatus source="revenuecat" />
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="MRR" value={formatCurrency(ov.mrr)} hint="monthly recurring" />
        <KpiCard label="Revenue" value={formatCurrency(ov.revenue28d)} hint="last 28 days" />
        <KpiCard label="Active subscriptions" value={formatNumber(ov.activeSubscriptions)} />
        <KpiCard label="Active trials" value={formatNumber(ov.activeTrials)} />
        <KpiCard label="New customers" value={formatNumber(ov.newCustomers28d)} hint="last 28 days" />
        <KpiCard label="Active customers" value={formatNumber(ov.activeUsers28d)} hint="last 28 days" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>MRR (90 days)</CardTitle>
          <div className="mt-3">
            <TimeSeries data={mrr.points} series={[{ key: "value", label: "MRR (USD)", color: "#4ade80" }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Revenue (90 days)</CardTitle>
          <div className="mt-3">
            <TimeSeries data={revenue.points} series={[{ key: "value", label: "Revenue (USD)", color: "#818cf8" }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Active subscriptions (90 days)</CardTitle>
          <div className="mt-3">
            <TimeSeries data={actives.points} series={[{ key: "value", label: "Active", color: "#38bdf8" }]} />
          </div>
        </Card>
        <Card>
          <CardTitle>Trials (90 days)</CardTitle>
          <div className="mt-3">
            <TimeSeries data={trials.points} series={[{ key: "value", label: "Trials", color: "#fbbf24" }]} />
          </div>
        </Card>
      </div>

      {ov.updatedAt && (
        <p className="mt-4 text-xs text-muted">
          Last updated: {new Date(ov.updatedAt).toLocaleString()} · aggregate + charts from
          RevenueCat Metrics/Charts API.
        </p>
      )}
    </>
  );
}
