import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { syncAttribution } from "@/lib/attribution/sync";
import { isAuthorizedSync } from "@/lib/sync/authorize";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run(req: Request) {
  if (!isAuthorizedSync(req)) {
    return NextResponse.json({ error: { code: "unauthorized" } }, { status: 401 });
  }
  const result = await syncAttribution();
  if (result.status === "error") {
    return NextResponse.json(result, { status: 200 });
  }
  revalidatePath("/attribution");
  revalidatePath("/influencers");
  return NextResponse.json(result);
}

export const GET = run;
export const POST = run;
