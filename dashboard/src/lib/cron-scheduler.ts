import cron from "node-cron";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";
import { ingestGlobalJobCache } from "@/lib/job-ingest";
import { pollInboxEmails } from "@/lib/email-imap";
import { db } from "@/lib/db";

let started = false;

/**
 * One-time startup cleanup: delete AutoApplyJob rows that have been permanently
 * closed or failed for more than 24 hours. These clog the queue and prevent
 * new eligible jobs from being discovered.
 */
async function purgeStaleQueue(): Promise<void> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    // Only purge old FAILED jobs (transient errors worth clearing).
    // NEVER delete SKIPPED jobs — they are the permanent "closed / don't retry" blacklist.
    // Deleting them causes closed jobs to be re-added to the queue on the next cycle.
    const deleted = await db.autoApplyJob.deleteMany({
      where: {
        updatedAt: { lt: threeDaysAgo },
        status: "failed",
      },
    });
    if (deleted.count > 0) {
      console.log(`[queue-cleanup] purged ${deleted.count} stale failed jobs`);
    }
  } catch (err) {
    console.error("[queue-cleanup] error:", err);
  }
}

export function scheduleAutoApplyCron() {
  if (started) return;
  started = true;

  // Bulk-ingest ATS board jobs once on startup and then every 2 hours.
  // This populates JobListing with hundreds of Greenhouse/Lever jobs so
  // the auto-apply queue has a large relevant pool to draw from.
  const runIngest = async () => {
    console.log("[job-ingest cron] starting bulk ingest");
    try {
      const result = await ingestGlobalJobCache();
      console.log("[job-ingest cron] done:", result);
    } catch (err) {
      console.error("[job-ingest cron] error:", err);
    }
  };

  // Purge stale queue on startup so closed/failed jobs don't block new ones
  setTimeout(purgeStaleQueue, 5_000);

  // Run immediately on startup (after a short delay so the server is ready)
  setTimeout(runIngest, 30_000);

  // Then every 2 hours
  cron.schedule("0 */2 * * *", runIngest);

  // Auto-apply worker — every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[auto-apply cron] starting worker run");
    try {
      const stats = await runAutoApplyWorker();
      console.log("[auto-apply cron] done:", stats);
    } catch (err) {
      console.error("[auto-apply cron] error:", err);
    }
  });

  // Inbox email poller — every 2 minutes.
  // Connects to the Titan Mail catch-all (hi@swiftdroom.com) and routes incoming
  // emails to the right user by their *@swiftdroom.com alias. Auto-extracts
  // Greenhouse security codes and completes pending applications automatically.
  const runEmailPoll = async () => {
    try {
      await pollInboxEmails();
    } catch (err) {
      console.error("[email-poll cron] error:", err);
    }
  };

  // Run immediately on startup so codes received just before a restart aren't missed
  setTimeout(runEmailPoll, 45_000);

  cron.schedule("*/2 * * * *", runEmailPoll);

  console.log("[auto-apply cron] scheduled — runs every 15 minutes");
  console.log("[email-poll cron] scheduled — runs every 2 minutes");
}
