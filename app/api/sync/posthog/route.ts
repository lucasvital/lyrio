import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { syncPostHog } from "@/lib/sync/posthog/ingest";
import { isAuthorizedSync } from "@/lib/sync/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  if (!isAuthorizedSync(req)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const result = await syncPostHog();
  if (result.status === "error") {
    return NextResponse.json(result, { status: 200 });
  }
  revalidateTag("posthog");
  revalidateTag("unified");
  return NextResponse.json(result);
}

export const GET = run; // Vercel Cron issues GET
export const POST = run; // manual trigger
