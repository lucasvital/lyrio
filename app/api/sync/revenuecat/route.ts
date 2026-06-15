import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { syncRevenueCat } from "@/lib/sync/revenuecat/ingest";
import { isAuthorizedSync } from "@/lib/sync/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  if (!isAuthorizedSync(req)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const result = await syncRevenueCat();
  if (result.status === "error") {
    return NextResponse.json(result, { status: 200 });
  }
  revalidateTag("revenuecat");
  revalidateTag("unified");
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
