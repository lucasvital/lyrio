import { getCheckpoint } from "@/lib/sync/sync-state";
import type { SyncSource } from "@/lib/logger";

/** Shows last sync time/status for a source (Story 2.3/3.3 AC5). */
export async function SyncStatus({ source }: { source: SyncSource }) {
  let label = "never synced";
  let dot = "bg-muted";
  try {
    const cp = await getCheckpoint(source);
    if (cp?.lastRunAt) {
      label = `${cp.status ?? "?"} · ${new Date(cp.lastRunAt).toLocaleString()}`;
      dot =
        cp.status === "ok"
          ? "bg-positive"
          : cp.status === "error"
            ? "bg-negative"
            : "bg-muted";
    }
  } catch {
    label = "db unavailable";
  }
  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {source}: {label}
    </span>
  );
}
