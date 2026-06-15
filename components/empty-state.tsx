import { Card } from "@/components/ui/card";

/** Shown when no data is present yet (e.g., before first sync or missing creds). */
export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="mt-1 max-w-md text-xs text-muted">{hint}</p>}
    </Card>
  );
}
