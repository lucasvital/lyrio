import type { DateRange } from "./posthog";

/** Parse the global period filter from URL search params (Story 5.2). */
export function parseRange(searchParams?: { from?: string; to?: string; days?: string }): DateRange {
  const to = searchParams?.to ? new Date(searchParams.to) : new Date();
  if (searchParams?.from) {
    return { from: new Date(searchParams.from), to };
  }
  const days = searchParams?.days ? Number(searchParams.days) : 30;
  const from = new Date(to);
  from.setDate(from.getDate() - (Number.isFinite(days) ? days : 30));
  return { from, to };
}

export const RANGE_PRESETS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
] as const;
