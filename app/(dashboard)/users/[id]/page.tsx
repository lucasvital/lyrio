import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { safeQuery } from "@/lib/analytics/safe";
import { getUnifiedUserProfile } from "@/lib/analytics/unified";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  const profile = await safeQuery(() => getUnifiedUserProfile(decodedId), null);

  if (!profile) {
    return (
      <>
        <PageHeader title="User profile" />
        <EmptyState
          title={`No data for "${decodedId}"`}
          hint="This id was not found in either PostHog or RevenueCat (after sync)."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={profile.email ?? profile.id} description={`Unified profile · id: ${profile.id}`} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total events" value={formatNumber(profile.totalEvents)} hint="PostHog" />
        <KpiCard label="Total revenue" value={formatCurrency(profile.totalRevenue)} hint="RevenueCat" />
        <KpiCard label="Subscriber" value={profile.isSubscriber ? "Active" : "No"} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Sources</CardTitle>
          <ul className="mt-3 space-y-1 text-sm">
            <li className="text-muted">
              PostHog: {profile.hasPosthog ? "✓ present" : "— no data"}
            </li>
            <li className="text-muted">
              RevenueCat: {profile.hasRevenuecat ? "✓ present" : "— no data"}
            </li>
          </ul>
        </Card>
        <Card>
          <CardTitle>Timeline</CardTitle>
          <ul className="mt-3 space-y-1 text-sm text-muted">
            <li>First seen: {profile.firstSeenAt ?? "—"}</li>
            <li>Last seen: {profile.lastSeenAt ?? "—"}</li>
          </ul>
        </Card>
      </div>

      <Link href="/unified" className="mt-6 inline-block text-xs text-primary">
        ← Back to unified analytics
      </Link>
    </>
  );
}
