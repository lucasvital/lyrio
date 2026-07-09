"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { deleteInfluencer, upsertInfluencer } from "@/lib/actions";
import { formatCurrency, formatNumber } from "@/lib/utils";

export interface InfluencerRow {
  id: string;
  name: string;
  handle: string | null;
  platform: string | null;
  commissionPercent: number;
  couponCodes: string[];
  notes: string | null;
  sales: number;
  attributedUsers: number;
  revenue: number;
  commission: number;
}

const EMPTY = {
  id: "",
  name: "",
  handle: "",
  platform: "",
  couponCodes: "",
  commissionPercent: "30",
  notes: "",
};

export function InfluencerManager({ rows }: { rows: InfluencerRow[] }) {
  const [form, setForm] = useState({ ...EMPTY });
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function edit(r: InfluencerRow) {
    setForm({
      id: r.id,
      name: r.name,
      handle: r.handle ?? "",
      platform: r.platform ?? "",
      couponCodes: r.couponCodes.join(", "),
      commissionPercent: String(r.commissionPercent),
      notes: r.notes ?? "",
    });
    setShowForm(true);
    setMsg(null);
  }

  function reset() {
    setForm({ ...EMPTY });
    setShowForm(false);
    setMsg(null);
  }

  function save() {
    setMsg(null);
    startTransition(async () => {
      const res = await upsertInfluencer({
        id: form.id || undefined,
        name: form.name,
        handle: form.handle || null,
        platform: form.platform || null,
        couponCodes: form.couponCodes,
        commissionPercent: form.commissionPercent,
        notes: form.notes || null,
      });
      setMsg(res.message);
      if (res.ok) reset();
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Remover influencer "${name}"? As atribuições voltam a ficar sem origem.`)) return;
    startTransition(async () => {
      const res = await deleteInfluencer(id);
      setMsg(res.message);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted">Influencers / parceiros</h3>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
          >
            <Plus size={14} /> Novo
          </button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-elevated/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {form.id ? `Editar: ${form.id}` : "Novo influencer"}
            </p>
            <button onClick={reset} className="text-muted hover:text-foreground">
              <X size={16} />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted">
              Nome *
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              Handle / canal
              <input
                value={form.handle}
                onChange={(e) => setForm({ ...form, handle: e.target.value })}
                placeholder="@usuario"
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              Plataforma
              <input
                value={form.platform}
                onChange={(e) => setForm({ ...form, platform: e.target.value })}
                placeholder="instagram / youtube / tiktok"
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted">
              Comissão (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.5"
                value={form.commissionPercent}
                onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <label className="text-xs text-muted sm:col-span-2">
              Cupons (separados por vírgula) — usados para atribuir automaticamente
              <input
                value={form.couponCodes}
                onChange={(e) => setForm({ ...form, couponCodes: e.target.value })}
                placeholder="VERAO20, JOAO10"
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm font-mono text-foreground"
              />
            </label>
            <label className="text-xs text-muted sm:col-span-2">
              Notas
              <input
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={save}
              disabled={pending || !form.name.trim()}
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium"
            >
              Cancelar
            </button>
            {msg && <span className="text-xs text-muted">{msg}</span>}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="pb-2 pr-3 font-medium">Influencer</th>
              <th className="pb-2 pr-3 font-medium">Cupons</th>
              <th className="pb-2 pr-3 text-right font-medium">Taxa</th>
              <th className="pb-2 pr-3 text-right font-medium">Vendas</th>
              <th className="pb-2 pr-3 text-right font-medium">Receita</th>
              <th className="pb-2 pr-3 text-right font-medium">Comissão</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr className="border-t border-border">
                <td colSpan={7} className="py-4 text-center text-muted">
                  Nenhum influencer cadastrado ainda.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="py-2 pr-3">
                  <div className="font-medium text-foreground">{r.name}</div>
                  <div className="text-xs text-muted">
                    {[r.handle, r.platform].filter(Boolean).join(" · ") || r.id}
                  </div>
                </td>
                <td className="py-2 pr-3">
                  <div className="flex flex-wrap gap-1">
                    {r.couponCodes.length === 0 ? (
                      <span className="text-muted">—</span>
                    ) : (
                      r.couponCodes.map((c) => (
                        <span
                          key={c}
                          className="rounded bg-elevated px-1.5 py-0.5 font-mono text-[11px]"
                        >
                          {c}
                        </span>
                      ))
                    )}
                  </div>
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{r.commissionPercent}%</td>
                <td className="py-2 pr-3 text-right tabular-nums">
                  {formatNumber(r.sales)}
                  {r.attributedUsers > r.sales && (
                    <span className="text-xs text-muted"> (+{r.attributedUsers - r.sales} grátis)</span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatCurrency(r.revenue)}</td>
                <td className="py-2 pr-3 text-right font-medium tabular-nums text-positive">
                  {formatCurrency(r.commission)}
                </td>
                <td className="py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => edit(r)}
                      className="rounded-lg border border-border p-1.5 hover:bg-elevated"
                      title="Editar"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => remove(r.id, r.name)}
                      className="rounded-lg border border-border p-1.5 text-negative hover:bg-elevated"
                      title="Remover"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
