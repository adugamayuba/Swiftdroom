import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { enqueueAutoApplyJobs, runAutoApplyWorker } from "@/lib/auto-apply-worker";
import { apiError } from "@/lib/user-messages";

/**
 * Manual trigger for the auto-apply worker — processes the current user only.
 * Used from the dashboard to kick off a run on demand.
 */
export async function POST(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  try {
    const queued = await enqueueAutoApplyJobs(gate.user.id);
    return NextResponse.json({ ok: true, queued });
  } catch (err) {
    console.error("Auto-apply enqueue error:", err);
    return apiError("Failed to queue jobs", 500);
  }
}
