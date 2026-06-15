"use client";

import { useState, useTransition } from "react";
import { debugChart, debugIdentity, debugRevenueCat } from "@/lib/actions";

/**
 * Diagnostics for RevenueCat / identity (raw API + DB inspection).
 * TODO(remove): temporary — delete this panel once mappings are confirmed.
 */
export function DebugPanel() {
  const [pending, startTransition] = useTransition();
  const [output, setOutput] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [chartName, setChartName] = useState("mrr");

  function run(fn: () => Promise<unknown>) {
    setOutput(null);
    startTransition(async () => {
      const result = await fn();
      setOutput(JSON.stringify(result, null, 2));
    });
  }

  const btn =
    "rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50";
  const input =
    "min-w-[220px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={customerId}
          onChange={(e) => setCustomerId(e.target.value)}
          placeholder="Known paying App User ID (optional)"
          className={input}
        />
        <button onClick={() => run(() => debugRevenueCat(customerId))} disabled={pending} className={btn}>
          Debug customer
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          value={chartName}
          onChange={(e) => setChartName(e.target.value)}
          placeholder="chart name (mrr, revenue, actives…)"
          className={input}
        />
        <button onClick={() => run(() => debugChart(chartName))} disabled={pending} className={btn}>
          Debug chart
        </button>
      </div>

      <button onClick={() => run(() => debugIdentity())} disabled={pending} className={btn}>
        Debug identity (id formats &amp; property keys)
      </button>

      {pending && <p className="text-xs text-muted">Working…</p>}
      {output && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
          {output}
        </pre>
      )}
    </div>
  );
}
