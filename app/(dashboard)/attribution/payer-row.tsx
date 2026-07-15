"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { saveManualAttribution } from "@/lib/actions";
import type { PayerAttribution, ResolutionMethod } from "@/lib/analytics/attribution";
import { formatCurrency, cn } from "@/lib/utils";

const METHOD_STYLE: Record<ResolutionMethod, string> = {
  influencer: "bg-positive/15 text-positive ring-positive/25",
  coupon: "bg-primary/15 text-primary ring-primary/25",
  manual: "bg-primary/15 text-primary ring-primary/25",
  auto: "bg-elevated text-muted ring-border",
  none: "bg-negative/10 text-negative ring-negative/25",
};

const METHOD_LABEL: Record<ResolutionMethod, string> = {
  influencer: "influencer",
  coupon: "cupom",
  manual: "manual",
  auto: "auto",
  none: "sem origem",
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function Signal({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="shrink-0 text-muted">{label}:</span>
      <span className="break-all font-mono text-[11px] text-foreground">{value}</span>
    </div>
  );
}

export function PayerRow({
  payer,
  influencers,
}: {
  payer: PayerAttribution;
  influencers: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [influencerId, setInfluencerId] = useState(payer.manualInfluencerId ?? "");
  const [source, setSource] = useState(payer.manualSource ?? "");
  const [note, setNote] = useState(payer.note ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await saveManualAttribution({
        appUserId: payer.id,
        influencerId: influencerId || null,
        source: source || null,
        note: note || null,
      });
      setMsg(res.message);
    });
  }

  return (
    <>
      <tr className="border-t border-border align-top">
        <td className="py-2 pr-3">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-start gap-1 text-left"
          >
            {open ? (
              <ChevronDown size={14} className="mt-0.5 shrink-0 text-muted" />
            ) : (
              <ChevronRight size={14} className="mt-0.5 shrink-0 text-muted" />
            )}
            <span className="max-w-[220px] truncate text-foreground" title={payer.email ?? payer.id}>
              {payer.email ?? payer.id}
            </span>
            {payer.isSandbox && (
              <span className="shrink-0 rounded bg-negative/10 px-1.5 py-0.5 text-[10px] font-medium text-negative ring-1 ring-negative/25">
                sandbox
              </span>
            )}
          </button>
        </td>
        <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(payer.spent)}</td>
        <td className="py-2 pr-3 text-muted">{fmtDate(payer.firstPurchaseAt)}</td>
        <td className="py-2 pr-3">
          {payer.couponCode ? (
            <span className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px]">
              {payer.couponCode}
            </span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </td>
        <td className="py-2 pr-3">
          <div className="flex items-center gap-2">
            <span className="max-w-[160px] truncate" title={payer.resolvedLabel}>
              {payer.resolvedLabel}
            </span>
            <span
              className={cn(
                "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ring-1",
                METHOD_STYLE[payer.resolvedMethod],
              )}
            >
              {METHOD_LABEL[payer.resolvedMethod]}
            </span>
          </div>
        </td>
        <td className="py-2 text-right">
          <button
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-elevated"
          >
            Atribuir
          </button>
        </td>
      </tr>

      {open && (
        <tr className="border-t border-border/50 bg-elevated/30">
          <td colSpan={6} className="px-3 py-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Raw first-touch signals for the audit */}
              <div className="space-y-1 text-xs">
                <p className="mb-1 font-medium text-foreground">Sinais de origem (first-touch)</p>
                <Signal label="Primeiro evento" value={payer.firstEvent} />
                <Signal label="Primeiro acesso" value={fmtDate(payer.firstTouchAt)} />
                <Signal label="utm_source" value={payer.autoSource} />
                <Signal label="utm_medium" value={payer.autoMedium} />
                <Signal label="utm_campaign" value={payer.autoCampaign} />
                <Signal label="network" value={payer.autoNetwork} />
                <Signal label="referrer" value={payer.autoReferrer} />
                <Signal label="ref. domain" value={payer.autoReferringDomain} />
                <Signal label="url" value={payer.autoUrl} />
                <Signal label="cupom" value={payer.couponCode} />
                {!payer.autoSource &&
                  !payer.autoReferrer &&
                  !payer.autoUrl &&
                  !payer.couponCode && (
                    <p className="text-muted">
                      Nenhum sinal automático — atribua manualmente com base no que souber.
                    </p>
                  )}
                <p className="pt-1">
                  <Link
                    href={`/users/${encodeURIComponent(payer.id)}`}
                    className="text-primary hover:underline"
                  >
                    Ver perfil completo →
                  </Link>
                </p>
              </div>

              {/* Manual attribution form */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Atribuição manual</p>
                <label className="block text-xs text-muted">
                  Influencer
                  <select
                    value={influencerId}
                    onChange={(e) => setInfluencerId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                  >
                    <option value="">— nenhum —</option>
                    {influencers.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs text-muted">
                  Origem livre (se não houver influencer)
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    placeholder="ex: instagram orgânico, indicação..."
                    className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
                <label className="block text-xs text-muted">
                  Nota
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="observação da auditoria"
                    className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
                  />
                </label>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={save}
                    disabled={pending}
                    className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {pending ? "Salvando…" : "Salvar"}
                  </button>
                  {msg && <span className="text-xs text-muted">{msg}</span>}
                  {payer.attributedBy && (
                    <span className="text-xs text-muted">
                      Auditado por {payer.attributedBy}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
