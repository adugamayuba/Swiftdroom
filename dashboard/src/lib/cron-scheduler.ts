import cron from "node-cron";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";
import { ingestGlobalJobCache } from "@/lib/job-ingest";

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

  console.log("[auto-apply cron] scheduled — runs every 15 minutes");
}
