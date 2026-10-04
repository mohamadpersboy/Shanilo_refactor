import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Liveness only. Reads no ENV and exposes no internal information. */
export function GET() {
  return NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
}
