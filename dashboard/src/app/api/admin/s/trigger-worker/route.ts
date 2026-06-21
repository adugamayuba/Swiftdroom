import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";
import { pollInboxEmails } from "@/lib/email-imap";
import { ingestGlobalJobCache } from "@/lib/job-ingest";

/**
 * POST /api/admin/s/trigger-worker
 * Manually kick off the auto-apply worker (and optionally job ingest / email poll)
 * so all enabled users get processed immediately without waiting for the cron.
 */
export async function POST(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action = "worker" } = (await request.json().catch(() => ({}))) as {
    action?: "worker" | "ingest" | "poll" | "all";
  };

  const results: Record<string, unknown> = {};

  if (action === "ingest" || action === "all") {
    try {
      results.ingest = await ingestGlobalJobCache();
    } catch (err) {
      results.ingestError = String(err);
    }
  }

  if (action === "poll" || action === "all") {
    try {
      await pollInboxEmails();
      results.poll = "ok";
    } catch (err) {
      results.pollError = String(err);
    }
  }

  if (action === "worker" || action === "all") {
    try {
      results.worker = await runAutoApplyWorker();
    } catch (err) {
      results.workerError = String(err);
    }
  }

  return NextResponse.json({ ok: true, action, results });
}
