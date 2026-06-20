/**
 * Next.js instrumentation — runs once when the server process starts.
 * Used to boot the in-process cron scheduler on Railway.
 *
 * Docs: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  // Only run in Node.js runtime (not Edge), and only in production
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NODE_ENV === "production"
  ) {
    const { scheduleAutoApplyCron } = await import("@/lib/cron-scheduler");
    scheduleAutoApplyCron();
  }
}
