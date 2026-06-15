import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { Bars } from "@/components/charts/bars";
import { Funnel } from "@/components/charts/funnel";
import { parseRange } from "@/lib/analytics/range";
import { safeQuery } from "@/lib/analytics/safe";
import { getMatchCoverage } from "@/lib/identity";
import { getConversionFunnel, getRevenueByEngagement } from "@/lib/analytics/unified";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UnifiedPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; from?: string; to?: string }>;
}) {
  const range = parseRange(await searchParams);

  const [coverage, byEngagement, funnel] = await Promise.all([
    safeQuery(() => getMatchCoverage(), {
      total: 0,
      matched: 0,
      posthogOnly: 0,
      revenuecatOnly: 0,
      matchRate: 0,
    }),
    safeQuery(() => getRevenueByEngagement(range), []),
    safeQuery(() => getConversionFunnel(range), {
      totalUsers: 0,
      activatedUsers: 0,
      payingUsers: 0,
      activationRate: 0,
      conversionRate: 0,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Unified"
        description="PostHog × RevenueCat — joined by distinct_id = app_user_id"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Identity match rate" value={formatPercent(coverage.matchRate)} hint={`${formatNumber(coverage.matched)} matched`} />
        <KpiCard label="Total users" value={formatNumber(coverage.total)} />
        <KpiCard label="PostHog only" value={formatNumber(coverage.posthogOnly)} />
        <KpiCard label="RevenueCat only" value={formatNumber(coverage.revenuecatOnly)} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Revenue by engagement cohort</CardTitle>
          <p className="mb-3 mt-1 text-xs text-muted">
            Total revenue grouped by number of events per user.
          </p>
          <Bars data={byEngagement} xKey="bucket" yKey="revenue" label="Revenue (USD)" color="#4ade80" />
        </Card>

        <Card>
          <CardTitle>Activation → subscription funnel</CardTitle>
          <p className="mb-3 mt-1 text-xs text-muted">
            Activated = ≥3 events. Conversion = active subscribers.
          </p>
          <Funnel
            steps={[
              { label: "All users", value: funnel.totalUsers },
              { label: "Activated", value: funnel.activatedUsers },
              { label: "Paying", value: funnel.payingUsers },
            ]}
          />
        </Card>
      </div>
    </>
  );
}
