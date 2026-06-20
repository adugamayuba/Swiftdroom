import cron from "node-cron";
import { runAutoApplyWorker } from "@/lib/auto-apply-worker";

let started = false;

export function scheduleAutoApplyCron() {
  if (started) return;
  started = true;

  // Run every hour at minute 5 (give the server a moment after deploy)
  cron.schedule("5 * * * *", async () => {
    console.log("[auto-apply cron] starting worker run");
    try {
      const stats = await runAutoApplyWorker();
      console.log("[auto-apply cron] done:", stats);
    } catch (err) {
      console.error("[auto-apply cron] error:", err);
    }
  });

  console.log("[auto-apply cron] scheduled — runs every hour");
}
