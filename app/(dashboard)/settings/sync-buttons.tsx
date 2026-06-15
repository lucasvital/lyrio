"use client";

import { useState, useTransition } from "react";
import { triggerPostHogSync, triggerRevenueCatSync } from "@/lib/actions";

export function SyncButtons() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(which: "posthog" | "revenuecat") {
    setMessage(null);
    startTransition(async () => {
      const result =
        which === "posthog"
          ? await triggerPostHogSync()
          : await triggerRevenueCatSync();
      setMessage(
        result.status === "ok"
          ? `${which}: synced ${result.ingested} records`
          : `${which}: error — ${result.message ?? "unknown"}`,
      );
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button
          onClick={() => run("posthog")}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync PostHog
        </button>
        <button
          onClick={() => run("revenuecat")}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync RevenueCat
        </button>
      </div>
      {pending && <p className="text-xs text-muted">Syncing…</p>}
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
