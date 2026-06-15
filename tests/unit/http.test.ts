import { describe, it, expect } from "vitest";
import { computeBackoff } from "@/lib/sync/http";

describe("computeBackoff", () => {
  it("grows exponentially from the base delay", () => {
    expect(computeBackoff(1, 500)).toBe(500);
    expect(computeBackoff(2, 500)).toBe(1000);
    expect(computeBackoff(3, 500)).toBe(2000);
  });

  it("is capped at maxDelayMs", () => {
    expect(computeBackoff(20, 500, 30_000)).toBe(30_000);
  });
});
