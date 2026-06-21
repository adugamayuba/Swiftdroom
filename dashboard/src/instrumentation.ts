/**
 * Next.js instrumentation — runs once when the server process starts.
 * Used to boot the in-process cron scheduler on Railway.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Run in Node.js runtime only (not Edge). Active in both production and development
  // so the auto-apply worker, email poller, and job ingest run end-to-end during testing.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { scheduleAutoApplyCron } = await import("@/lib/cron-scheduler");
    scheduleAutoApplyCron();
  }
}
