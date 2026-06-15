import { NextResponse } from "next/server";
import { rcGet, rcProjectId } from "@/lib/sync/revenuecat/client";
import { isAuthorizedSync } from "@/lib/sync/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Diagnostic: dump the raw shape of RevenueCat v2 responses for one customer so
 * field mapping can be verified. Guarded by CRON_SECRET. Remove once mapping is
 * confirmed. NOTE: returns real (possibly PII) data — sanitize before sharing.
 */
async function run(req: Request) {
  if (!isAuthorizedSync(req)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }

  try {
    const pid = rcProjectId();
    const customers = (await rcGet(`/v2/projects/${pid}/customers?limit=2`)) as {
      items?: Array<{ id?: string }>;
    };
    const first = customers.items?.[0];
    const id = first?.id;

    const safe = async (path: string) => {
      try {
        return await rcGet(path);
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    };

    const detail = id
      ? {
          active_entitlements: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/active_entitlements?limit=10`,
          ),
          subscriptions: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/subscriptions?limit=10`,
          ),
          purchases: await safe(
            `/v2/projects/${pid}/customers/${encodeURIComponent(id)}/purchases?limit=10`,
          ),
        }
      : null;

    return NextResponse.json({
      projectId: pid,
      customersSample: customers,
      firstCustomerId: id ?? null,
      detail,
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
