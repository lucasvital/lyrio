import { formatNumber, formatPercent } from "@/lib/utils";

export interface FunnelStep {
  label: string;
  value: number;
}

/** Lightweight funnel (server-renderable) for activation → conversion. */
export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const max = Math.max(1, ...steps.map((s) => s.value));
  return (
    <div className="space-y-3" role="img" aria-label="Conversion funnel">
      {steps.map((step, i) => {
        const widthPct = (step.value / max) * 100;
        const prev = i > 0 ? steps[i - 1].value : step.value;
        const stepRate = prev > 0 ? step.value / prev : 0;
        return (
          <div key={step.label}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{step.label}</span>
              <span className="text-muted">
                {formatNumber(step.value)}
                {i > 0 && ` · ${formatPercent(stepRate)}`}
              </span>
            </div>
            <div className="h-7 w-full rounded bg-border/40">
              <div
                className="h-7 rounded bg-primary"
                style={{ width: `${Math.max(2, widthPct)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
