import { describe, it, expect } from "vitest";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

describe("formatters", () => {
  it("formats currency in USD", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
  });

  it("formats numbers with thousands separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats percentages", () => {
    expect(formatPercent(0.1234)).toBe("12.3%");
  });
});
