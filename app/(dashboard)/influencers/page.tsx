import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { safeQuery } from "@/lib/analytics/safe";
import { getInfluencerCommissions, listInfluencers } from "@/lib/analytics/attribution";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { InfluencerManager, type InfluencerRow } from "./influencer-manager";

export const dynamic = "force-dynamic";

export default async function InfluencersPage() {
  const [commissions, influencers] = await Promise.all([
    safeQuery(() => getInfluencerCommissions(), []),
    safeQuery(() => listInfluencers(), []),
  ]);

  const detail = new Map(influencers.map((i) => [i.id, i]));
  const rows: InfluencerRow[] = commissions.map((c) => {
    const d = detail.get(c.id);
    return {
      id: c.id,
      name: c.name,
      handle: c.handle,
      platform: c.platform,
      commissionPercent: Math.round(c.commissionRate * 10000) / 100,
      couponCodes: d?.couponCodes ?? [],
      notes: d?.notes ?? null,
      sales: c.sales,
      attributedUsers: c.attributedUsers,
      revenue: c.revenue,
      commission: c.commission,
    };
  });

  const totalSales = rows.reduce((a, r) => a + r.sales, 0);
  const totalRevenue = rows.reduce((a, r) => a + r.revenue, 0);
  const totalCommission = rows.reduce((a, r) => a + r.commission, 0);

  return (
    <>
      <PageHeader
        title="Influencers"
        description="Vendas e comissões por quem indicou. Cadastre cupons para atribuir automaticamente; o restante você atribui manualmente na aba Atribuição."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Influencers" value={formatNumber(rows.length)} />
        <KpiCard label="Vendas atribuídas" value={formatNumber(totalSales)} />
        <KpiCard label="Receita atribuída" value={formatCurrency(totalRevenue)} />
        <KpiCard
          label="Comissão a pagar"
          value={formatCurrency(totalCommission)}
          hint="receita × taxa"
        />
      </div>

      <Card className="mt-4">
        <InfluencerManager rows={rows} />
      </Card>
    </>
  );
}
