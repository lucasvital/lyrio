"use client";

import { useState, useTransition } from "react";
import {
  initDatabase,
  triggerAttributionSync,
  triggerPostHogSync,
  triggerRevenueCatSync,
} from "@/lib/actions";

export function SyncButtons() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function act(fn: () => Promise<{ message?: string; status?: string; ingested?: number }>, label: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await fn();
      if ("ingested" in result && result.status === "ok") {
        setMessage(`${label}: synced ${result.ingested} records`);
      } else if ("status" in result && result.status === "error") {
        setMessage(`${label}: error — ${result.message ?? "unknown"}`);
      } else {
        setMessage(`${label}: ${result.message ?? "done"}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => act(initDatabase, "Database")}
          disabled={pending}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium disabled:opacity-50"
        >
          Initialize database
        </button>
        <button
          onClick={() => act(triggerPostHogSync, "PostHog")}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync PostHog
        </button>
        <button
          onClick={() => act(triggerRevenueCatSync, "RevenueCat")}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync RevenueCat
        </button>
        <button
          onClick={() => act(triggerAttributionSync, "Attribution")}
          disabled={pending}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Sync Attribution
        </button>
      </div>
      <p className="text-xs text-muted">
        Ordem recomendada: PostHog → RevenueCat → Attribution (o último cruza os dois).
      </p>
      {pending && <p className="text-xs text-muted">Working…</p>}
      {message && <p className="text-xs text-muted">{message}</p>}
    </div>
  );
}
