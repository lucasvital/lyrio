import { formatNumber, formatPercent } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
}

/** Lightweight funnel (server-renderable) for activation → conversion or ranked lists. */
export function Funnel({
  steps,
  showRate = true,
}: {
  steps: FunnelStep[];
  showRate?: boolean;
}) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3" role="img" aria-label="Funnel chart">
      {steps.map((step, i) => {
        const widthPct = (step.value / max) * 100;
        const prev = i > 0 ? steps[i - 1].value : step.value;
        const stepRate = prev > 0 ? step.value / prev : 0;
        return (
          <div key={`${step.label}-${i}`}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span className="truncate text-muted">{step.label}</span>
              <span className="shrink-0 font-medium tabular-nums">
                {formatNumber(step.value)}
                {showRate && i > 0 && (
                  <span className="ml-1 text-xs text-muted">{formatPercent(stepRate)}</span>
                )}
              </span>
            </div>
            <div className="h-7 w-full overflow-hidden rounded-lg bg-border/40">
              <div
                className="h-7 rounded-lg bg-gradient-to-r from-primary to-accent"
                style={{ width: `${Math.max(2, widthPct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
