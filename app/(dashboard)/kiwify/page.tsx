import { CreditCard, XCircle, AlertTriangle, Layers } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { safeQuery } from "@/lib/analytics/safe";
import {
  getKiwifyByProject,
  getKiwifyKpis,
  getRecentKiwifyEvents,
} from "@/lib/analytics/kiwify";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KiwifyPage() {
  const [kpis, byProject, events] = await Promise.all([
    safeQuery(() => getKiwifyKpis(), { active: 0, canceled: 0, late: 0, total: 0, mrr: 0 }),
    safeQuery(() => getKiwifyByProject(), []),
    safeQuery(() => getRecentKiwifyEvents(), []),
  ]);

  return (
    <>
      <PageHeader title="Kiwify" description="Subscriptions per expert/project (via webhook)" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active subscriptions" value={formatNumber(kpis.active)} icon={CreditCard} />
        <KpiCard label="Canceled" value={formatNumber(kpis.canceled)} icon={XCircle} />
        <KpiCard label="Late" value={formatNumber(kpis.late)} icon={AlertTriangle} />
        <KpiCard label="Total" value={formatNumber(kpis.total)} icon={Layers} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>By project / expert</CardTitle>
          <div className="mt-3">
            {byProject.length === 0 ? (
              <EmptyState
                title="No Kiwify data yet"
                hint="Configure a project's webhook URL in Kiwify (see below) — incoming events appear here."
              />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Project</th>
                    <th className="pb-2 text-right font-medium">Active</th>
                    <th className="pb-2 text-right font-medium">Canceled</th>
                    <th className="pb-2 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {byProject.map((p) => (
                    <tr key={p.project} className="border-t border-border/60">
                      <td className="py-2">{p.project}</td>
                      <td className="py-2 text-right tabular-nums text-positive">{p.active}</td>
                      <td className="py-2 text-right tabular-nums text-muted">{p.canceled}</td>
                      <td className="py-2 text-right tabular-nums">{p.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle>Recent events</CardTitle>
          <div className="mt-3 space-y-2">
            {events.length === 0 ? (
              <p className="text-sm text-muted">No webhook events received yet.</p>
            ) : (
              events.map((e, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">
                    <span className="text-muted">{e.project}</span> · {e.eventType ?? "—"}
                  </span>
                  <span className="shrink-0 text-xs text-muted">
                    {e.receivedAt ? new Date(e.receivedAt).toLocaleString() : ""}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle>Webhook setup</CardTitle>
        <p className="mt-2 text-sm text-muted">
          In each expert&apos;s Kiwify account, add a webhook pointing to a unique URL per
          project:
        </p>
        <pre className="mt-2 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
          {`https://<your-app>/api/webhooks/kiwify/<project>`}
        </pre>
        <p className="mt-2 text-xs text-muted">
          Replace <code>&lt;project&gt;</code> with the expert/project slug. Enable the events:
          order_approved, subscription_renewed, subscription_late, subscription_canceled,
          order_refunded, chargeback. The slug tags all incoming data for that expert.
        </p>
      </Card>
    </>
  );
}
