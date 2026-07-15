import { describe, it, expect } from "vitest";
import { couponFromAttributes, normalizeAttributes } from "@/lib/sync/revenuecat/client";

describe("RevenueCat customer attributes", () => {
  it("normalizes a v2 items list", () => {
    const attrs = normalizeAttributes({
      items: [
        { name: "coupom_code", value: "PADRELEONARDO" },
        { name: "category", value: "influencer" },
        { name: "labels", value: "[]" },
      ],
    });
    expect(attrs.coupom_code).toBe("PADRELEONARDO");
    expect(attrs.category).toBe("influencer");
  });

  it("normalizes an object map with {value} wrappers", () => {
    const attrs = normalizeAttributes({
      attributes: { coupom_code: { value: "JOAO20" }, category: "influencer" },
    });
    expect(attrs.coupom_code).toBe("JOAO20");
    expect(attrs.category).toBe("influencer");
  });

  it("prefers the misspelled coupom_code, then coupon_code, ignoring category", () => {
    expect(couponFromAttributes({ coupom_code: "PADRELEONARDO", category: "influencer" })).toBe(
      "PADRELEONARDO",
    );
    expect(couponFromAttributes({ coupon_code: "JOAO20", category: "influencer" })).toBe("JOAO20");
    expect(couponFromAttributes({ category: "influencer" })).toBeNull();
    expect(couponFromAttributes({})).toBeNull();
  });

  it("is defensive against junk input", () => {
    expect(normalizeAttributes(null)).toEqual({});
    expect(normalizeAttributes("nope")).toEqual({});
    expect(couponFromAttributes(normalizeAttributes(undefined))).toBeNull();
  });
});
