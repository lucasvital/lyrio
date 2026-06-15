import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Funnel } from "@/components/charts/funnel";
import { SyncStatus } from "@/components/sync-status";
import { parseRange } from "@/lib/analytics/range";
import { safeQuery } from "@/lib/analytics/safe";
import { getProductKpis } from "@/lib/analytics/posthog";
import { getRevenueKpis } from "@/lib/analytics/revenuecat";
import { getConversionFunnel } from "@/lib/analytics/unified";
import { getMatchCoverage } from "@/lib/identity";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);

  const [product, revenue, funnel, coverage] = await Promise.all([
    safeQuery(() => getProductKpis(range), { activeUsers: 0, totalEvents: 0, eventsPerUser: 0 }),
    safeQuery(() => getRevenueKpis(range), {
      revenue: 0,
      transactions: 0,
      payingUsers: 0,
      activeSubscribers: 0,
      arpu: 0,
    }),
    safeQuery(() => getConversionFunnel(range), {
      totalUsers: 0,
      activatedUsers: 0,
      payingUsers: 0,
      activationRate: 0,
      conversionRate: 0,
    }),
    safeQuery(() => getMatchCoverage(), {
      total: 0,
      matched: 0,
      posthogOnly: 0,
      revenuecatOnly: 0,
      matchRate: 0,
    }),
  ]);

  return (
    <>
      <PageHeader title="Overview" description="Unified command center">
        <div className="flex flex-col items-end gap-1">
          <SyncStatus source="posthog" />
          <SyncStatus source="revenuecat" />
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active users" value={formatNumber(product.activeUsers)} hint="PostHog" />
        <KpiCard label="Revenue" value={formatCurrency(revenue.revenue)} hint="RevenueCat" />
        <KpiCard label="Active subscribers" value={formatNumber(revenue.activeSubscribers)} />
        <KpiCard label="Identity match" value={formatPercent(coverage.matchRate)} hint="unified" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Activation → subscription</CardTitle>
          <div className="mt-3">
            <Funnel
              steps={[
                { label: "All users", value: funnel.totalUsers },
                { label: "Activated", value: funnel.activatedUsers },
                { label: "Paying", value: funnel.payingUsers },
              ]}
            />
          </div>
          <Link href="/unified" className="mt-4 inline-block text-xs text-primary">
            View unified analytics →
          </Link>
        </Card>

        <Card>
          <CardTitle>Quick links</CardTitle>
          <div className="mt-3 space-y-2 text-sm">
            <Link href="/posthog" className="block text-muted hover:text-foreground">
              → PostHog product analytics
            </Link>
            <Link href="/revenuecat" className="block text-muted hover:text-foreground">
              → RevenueCat revenue analytics
            </Link>
            <Link href="/unified" className="block text-muted hover:text-foreground">
              → Cross-platform insights
            </Link>
            <Link href="/settings" className="block text-muted hover:text-foreground">
              → Settings & manual sync
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
}
