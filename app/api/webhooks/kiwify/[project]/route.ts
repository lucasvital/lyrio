import { NextResponse } from "next/server";
import { handleKiwifyWebhook } from "@/lib/kiwify/ingest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Kiwify webhook receiver, one URL per project/expert:
 *   POST /api/webhooks/kiwify/<project>?signature=<hmac_sha1>
 * Each expert points their Kiwify webhook here. The raw payload is always
 * stored; subscription state is upserted.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ project: string }> },
) {
  const { project } = await params;
  const raw = await req.text();
  const signature = new URL(req.url).searchParams.get("signature");
  const result = await handleKiwifyWebhook(decodeURIComponent(project), raw, signature);
  // Always 200 for processed events (avoid Kiwify retry storms); 400 only on bad input/signature.
  const status = result.ok ? 200 : result.error === "invalid signature" ? 401 : 400;
  return NextResponse.json(result, { status });
}

/** Health/verification for the URL. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string }> },
) {
  const { project } = await params;
  return NextResponse.json({
    ok: true,
    project: decodeURIComponent(project),
    hint: "POST Kiwify webhooks to this URL",
  });
}
