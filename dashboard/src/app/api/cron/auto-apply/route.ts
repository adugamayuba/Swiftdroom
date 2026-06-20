import { NextRequest, NextResponse } from "next/server";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";

/**
 * Cron route for auto-apply worker.
 * Triggered by Vercel cron (vercel.json) or Railway cron.
 * Protected by a shared secret.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await runAutoApplyWorker();
    return NextResponse.json({ ok: true, stats });
  } catch (err) {
    console.error("Auto-apply cron failed:", err);
    return NextResponse.json({ error: "Worker failed" }, { status: 500 });
  }
}

// Also allow GET for simple health-check triggers
export async function GET(request: NextRequest) {
  return POST(request);
}
