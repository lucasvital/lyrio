"use client";

import { useState, useTransition } from "react";
import { debugRevenueCat } from "@/lib/actions";

/** Runs the RevenueCat diagnostic and shows the raw JSON for copy/paste. */
export function DebugPanel() {
  const [pending, startTransition] = useTransition();
  const [output, setOutput] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");

  function run() {
    setOutput(null);
    startTransition(async () => {
      const result = await debugRevenueCat(customerId);
      setOutput(JSON.stringify(result, null, 2));
    });
  }

  return (
    <div className="space-y-3">
      <input
        value={customerId}
        onChange={(e) => setCustomerId(e.target.value)}
        placeholder="Known paying App User ID (optional)"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
      />
      <button
        onClick={run}
        disabled={pending}
        className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        Debug RevenueCat (show raw API response)
      </button>
      {pending && <p className="text-xs text-muted">Calling RevenueCat…</p>}
      {output && (
        <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 text-xs">
          {output}
        </pre>
      )}
    </div>
  );
}
