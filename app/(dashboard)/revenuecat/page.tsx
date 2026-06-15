import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { SyncStatus } from "@/components/sync-status";
import { safeQuery } from "@/lib/analytics/safe";
import { getRevenueOverview } from "@/lib/analytics/revenuecat";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevenueCatPage() {
  const ov = await safeQuery(() => getRevenueOverview(), {
    mrr: 0,
    revenue28d: 0,
    activeSubscriptions: 0,
    activeTrials: 0,
    newCustomers28d: 0,
    activeUsers28d: 0,
    updatedAt: null,
  });

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

      <div className="mt-4">
        <Card>
          <CardTitle>About these numbers</CardTitle>
          <p className="mt-2 text-sm text-muted">
            Aggregate metrics come from RevenueCat&apos;s Overview Metrics API and mirror
            your RevenueCat dashboard. Historical time-series charts require the
            Charts API and are a planned enhancement.
          </p>
          {ov.updatedAt && (
            <p className="mt-2 text-xs text-muted">
              Last updated: {new Date(ov.updatedAt).toLocaleString()}
            </p>
          )}
        </Card>
      </div>
    </>
  );
}
