import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Health check (Story 1.1 AC2). */
export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "lyrio-analytics-dashboard",
    timestamp: new Date().toISOString(),
  });
}
