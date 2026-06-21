import cron from "node-cron";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";
import { ingestGlobalJobCache } from "@/lib/job-ingest";
import { pollInboxEmails } from "@/lib/email-imap";

let started = false;

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
