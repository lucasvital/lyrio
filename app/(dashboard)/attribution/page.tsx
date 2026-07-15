import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { safeQuery } from "@/lib/analytics/safe";
import {
  getAttributionSummary,
  getPayersWithAttribution,
  listInfluencers,
} from "@/lib/analytics/attribution";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { PayerRow } from "./payer-row";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 200;

export default async function AttributionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    payers?: string;
    unattributed?: string;
    sandbox?: string;
  }>;
}) {
  const sp = await searchParams;
  const payersOnly = sp.payers !== "0";
  const unattributedOnly = sp.unattributed === "1";
  const includeSandbox = sp.sandbox === "1";
  const search = sp.q ?? "";

  const [summary, payers, influencers] = await Promise.all([
    safeQuery(() => getAttributionSummary(), {
      totalPayers: 0,
      attributedPayers: 0,
      unattributedPayers: 0,
      totalRevenue: 0,
      totalCommission: 0,
      sandboxPayers: 0,
    }),
    safeQuery(
      () =>
        getPayersWithAttribution({
          payersOnly,
          unattributedOnly,
          includeSandbox,
          search,
          limit: PAGE_SIZE,
        }),
      [],
    ),
    safeQuery(() => listInfluencers(), []),
  ]);

  const influencerOptions = influencers.map((i) => ({ id: i.id, name: i.name }));

  return (
    <>
      <PageHeader
        title="Atribuição"
        description="De onde veio cada cliente — cruzamento PostHog (UTM/origem) × RevenueCat (compras). Audite manualmente quem não tem sinal automático."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pagantes" value={formatNumber(summary.totalPayers)} hint="gastaram dinheiro" />
        <KpiCard
          label="Atribuídos"
          value={formatNumber(summary.attributedPayers)}
          hint={`${formatNumber(summary.unattributedPayers)} sem origem`}
        />
        <KpiCard label="Receita" value={formatCurrency(summary.totalRevenue)} hint="pagantes (LTV)" />
        <KpiCard
          label="Comissão estimada"
          value={formatCurrency(summary.totalCommission)}
          hint="receita atribuída × taxa"
        />
      </div>

      {summary.sandboxPayers > 0 && (
        <p className="mt-3 text-xs text-muted">
          {formatNumber(summary.sandboxPayers)} compra(s) de sandbox/teste excluída(s) da
          receita e das comissões.
        </p>
      )}

      <Card className="mt-4">
        <form className="flex flex-wrap items-end gap-3" method="GET">
          <label className="text-xs text-muted">
            Buscar (email / id / cupom)
            <input
              name="q"
              defaultValue={search}
              placeholder="ex: joao@… ou VERAO20"
              className="mt-1 block w-64 rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
            />
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="payers" value="0" defaultChecked={!payersOnly} />
            Incluir não-pagantes
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              name="unattributed"
              value="1"
              defaultChecked={unattributedOnly}
            />
            Só sem origem
          </label>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" name="sandbox" value="1" defaultChecked={includeSandbox} />
            Incluir sandbox
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            Filtrar
          </button>
        </form>
      </Card>

      <Card className="mt-4 overflow-x-auto">
        {payers.length === 0 ? (
          <EmptyState
            title="Nenhum cliente encontrado"
            hint="Rode o sync (RevenueCat + PostHog + Atribuição) em Configurações, ou ajuste os filtros."
          />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="pb-2 pr-3 font-medium">Cliente</th>
                <th className="pb-2 pr-3 text-right font-medium">Gasto</th>
                <th className="pb-2 pr-3 font-medium">1ª compra</th>
                <th className="pb-2 pr-3 font-medium">Cupom</th>
                <th className="pb-2 pr-3 font-medium">Origem</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {payers.map((p) => (
                <PayerRow key={p.id} payer={p} influencers={influencerOptions} />
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {payers.length >= PAGE_SIZE && (
        <p className="mt-3 text-xs text-muted">
          Mostrando os primeiros {PAGE_SIZE} resultados. Refine a busca para ver outros.
        </p>
      )}
    </>
  );
}
