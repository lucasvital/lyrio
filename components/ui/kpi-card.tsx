import { Card } from "./card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  delta,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
}) {
  return (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {typeof delta === "number" && (
          <span
            className={cn(
              "text-xs font-medium",
              delta >= 0 ? "text-positive" : "text-negative",
            )}
          >
            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </div>
    </Card>
  );
}
