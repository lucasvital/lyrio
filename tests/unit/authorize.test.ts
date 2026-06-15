import { describe, it, expect, beforeEach } from "vitest";
import { isAuthorizedSync } from "@/lib/sync/authorize";

// Reset the env cache between tests by reaching into module state via process.env.
beforeEach(() => {
  process.env.DATABASE_URL = "postgres://x";
  process.env.AUTH_SECRET = "test-secret";
  process.env.CRON_SECRET = "cron-123";
});

describe("isAuthorizedSync", () => {
  it("accepts a valid Bearer token", () => {
    const req = new Request("http://localhost/api/sync/posthog", {
      headers: { authorization: "Bearer cron-123" },
    });
    expect(isAuthorizedSync(req)).toBe(true);
  });

  it("accepts the x-cron-secret header", () => {
    const req = new Request("http://localhost/api/sync/posthog", {
      headers: { "x-cron-secret": "cron-123" },
    });
    expect(isAuthorizedSync(req)).toBe(true);
  });

  it("rejects an invalid secret", () => {
    const req = new Request("http://localhost/api/sync/posthog", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(isAuthorizedSync(req)).toBe(false);
  });
});
