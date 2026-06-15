"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RANGE_PRESETS } from "@/lib/analytics/range";
import { cn } from "@/lib/utils";

/**
 * Global period filter (Story 5.2). Persists in the URL so RSC pages read it
 * server-side and the state is shareable.
 */
export function PeriodFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("days") ?? "30";

  function select(days: number) {
    const next = new URLSearchParams(params.toString());
    next.set("days", String(days));
    next.delete("from");
    next.delete("to");
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {RANGE_PRESETS.map((p) => (
        <button
          key={p.days}
          onClick={() => select(p.days)}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            current === String(p.days)
              ? "bg-primary text-white"
              : "text-muted hover:text-foreground",
          )}
          aria-pressed={current === String(p.days)}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
