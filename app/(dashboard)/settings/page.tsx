import { PageHeader } from "@/components/page-header";
import { Card, CardTitle } from "@/components/ui/card";
import { SyncStatus } from "@/components/sync-status";
import { SyncButtons } from "./sync-buttons";

export const dynamic = "force-dynamic";

function StatusRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center justify-between text-sm">
      <span className="text-muted">{label}</span>
      <span className={ok ? "text-positive" : "text-negative"}>
        {ok ? "✓ configured" : "✗ missing"}
      </span>
    </li>
  );
}

export default function SettingsPage() {
  const config = {
    database: !!process.env.DATABASE_URL,
    auth: !!process.env.AUTH_SECRET,
    google: !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET,
    posthog: !!process.env.POSTHOG_API_KEY && !!process.env.POSTHOG_PROJECT_ID,
    revenuecat: !!process.env.REVENUECAT_API_KEY && !!process.env.REVENUECAT_PROJECT_ID,
    cron: !!process.env.CRON_SECRET,
  };

  return (
    <>
      <PageHeader title="Settings" description="Configuration & data synchronization" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Integration status</CardTitle>
          <ul className="mt-3 space-y-2">
            <StatusRow label="Database (Postgres)" ok={config.database} />
            <StatusRow label="Auth secret" ok={config.auth} />
            <StatusRow label="Google OAuth" ok={config.google} />
            <StatusRow label="PostHog API" ok={config.posthog} />
            <StatusRow label="RevenueCat API" ok={config.revenuecat} />
            <StatusRow label="Cron secret" ok={config.cron} />
          </ul>
          <p className="mt-4 text-xs text-muted">
            Configure these in your environment (see <code>.env.local.example</code>).
          </p>
        </Card>

        <Card>
          <CardTitle>Manual sync</CardTitle>
          <div className="mt-3 flex flex-col gap-2">
            <SyncStatus source="posthog" />
            <SyncStatus source="revenuecat" />
          </div>
          <div className="mt-4">
            <SyncButtons />
          </div>
        </Card>
      </div>
    </>
  );
}
