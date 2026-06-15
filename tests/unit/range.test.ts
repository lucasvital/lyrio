import { describe, it, expect } from "vitest";
import { parseRange } from "@/lib/analytics/range";

describe("parseRange", () => {
  it("defaults to a 30-day window", () => {
    const { from, to } = parseRange(undefined);
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    expect(days).toBe(30);
  });

  it("honors the days param", () => {
    const { from, to } = parseRange({ days: "7" });
    const days = Math.round((to.getTime() - from.getTime()) / 86_400_000);
    expect(days).toBe(7);
  });

  it("honors explicit from/to", () => {
    const r = parseRange({ from: "2026-01-01", to: "2026-01-31" });
    expect(r.from.toISOString().startsWith("2026-01-01")).toBe(true);
    expect(r.to.toISOString().startsWith("2026-01-31")).toBe(true);
  });
});
