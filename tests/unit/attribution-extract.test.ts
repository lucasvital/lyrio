import { describe, it, expect } from "vitest";
import { ATTRIBUTION_KEYS, SIGNAL_KEYS, columnExpr } from "@/lib/attribution/extract";

describe("attribution signal extraction", () => {
  it("SIGNAL_KEYS is the deduped union of all candidate keys", () => {
    const flat = Object.values(ATTRIBUTION_KEYS).flat();
    expect(new Set(SIGNAL_KEYS).size).toBe(SIGNAL_KEYS.length); // no dupes
    for (const k of flat) expect(SIGNAL_KEYS).toContain(k);
  });

  it("columnExpr coalesces the priority-ordered keys, earliest non-null first", () => {
    const expr = columnExpr("auto_source");
    expect(expr.startsWith("coalesce(")).toBe(true);
    // utm_source (highest priority) must appear before the fallback `source`.
    expect(expr.indexOf("'utm_source'")).toBeLessThan(expr.indexOf("'source'"));
    // uses the earliest-non-null array_agg pattern
    expect(expr).toContain("array_agg(properties->>'utm_source' ORDER BY timestamp ASC)");
    expect(expr).toContain("FILTER (WHERE nullif(properties->>'utm_source', '') IS NOT NULL)");
  });

  it("throws on an unknown output column", () => {
    expect(() => columnExpr("does_not_exist")).toThrow();
  });
});
