import { NextRequest, NextResponse } from "next/server";
import { ingestGlobalJobCache } from "@/lib/job-ingest";

/** Daily job cache refresh — schedule via Railway cron or external scheduler. */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ingestGlobalJobCache();
  return NextResponse.json(result);
}
