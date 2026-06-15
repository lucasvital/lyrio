import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/db/ensure-schema";
import { isAuthorizedSync } from "@/lib/sync/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Create/verify DB tables (idempotent). Guarded by CRON_SECRET. */
async function run(req: Request) {
  if (!isAuthorizedSync(req)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  try {
    await ensureSchema(true);
    return NextResponse.json({ status: "ok", message: "schema ensured" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export const GET = run;
export const POST = run;
