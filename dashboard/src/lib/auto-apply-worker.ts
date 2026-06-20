/**
 * Auto-apply worker — processes the AutoApplyJob queue for all enabled users.
 *
 * Called by the cron route at a scheduled interval (e.g. every hour).
 * Respects per-user daily limits and only targets Greenhouse/Lever jobs.
 */

import { db } from "@/lib/db";
import { applyViaLever } from "@/lib/apply-lever";
import { applyViaGreenhouse } from "@/lib/apply-greenhouse";
import type { ApplyPayload } from "@/lib/apply-lever";

const SUPPORTED_ATS = ["lever", "greenhouse"];

/** How many jobs to process per worker run per user (cap to avoid timeouts). */
const MAX_PER_RUN = 5;

export interface WorkerStats {
  usersProcessed: number;
  applied: number;
  failed: number;
  skipped: number;
}

/**
 * Enqueue new pending auto-apply jobs for a user based on their current feed.
 * Picks all "recommended" feed items above minMatchScore that aren't already queued.
 */
export async function enqueueAutoApplyJobs(userId: string): Promise<number> {
  const settings = await db.autoApplySettings.findUnique({ where: { userId } });
  if (!settings?.enabled) return 0;

  const existingJobIds = await db.autoApplyJob
    .findMany({
      where: { userId },
      select: { jobListingId: true },
    })
    .then((rows) => new Set(rows.map((r) => r.jobListingId)));

  const feedItems = await db.jobFeedItem.findMany({
    where: {
      userId,
      status: { in: ["recommended", "active"] },
      score: { gte: settings.minMatchScore },
    },
    include: { jobListing: true },
    orderBy: { score: "desc" },
    take: 50,
  });

  const toQueue = feedItems.filter(
    (item) =>
      !existingJobIds.has(item.jobListingId) &&
      SUPPORTED_ATS.includes(item.jobListing.atsType.toLowerCase())
  );

  if (toQueue.length === 0) return 0;

  await db.autoApplyJob.createMany({
    data: toQueue.map((item) => ({
      userId,
      jobListingId: item.jobListingId,
      atsType: item.jobListing.atsType.toLowerCase(),
      status: "pending",
    })),
    skipDuplicates: true,
  });

  return toQueue.length;
}

/** Count how many applications this user submitted today. */
async function countAppliedToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  return db.autoApplyJob.count({
    where: {
      userId,
      status: "applied",
      appliedAt: { gte: startOfDay },
    },
  });
}

/** Process pending auto-apply jobs for a single user. */
async function processUser(userId: string): Promise<Pick<WorkerStats, "applied" | "failed" | "skipped">> {
  const stats = { applied: 0, failed: 0, skipped: 0 };

  const settings = await db.autoApplySettings.findUnique({ where: { userId } });
  if (!settings?.enabled) return stats;

  // Check pause
  if (settings.pausedUntil && settings.pausedUntil > new Date()) return stats;

  const appliedToday = await countAppliedToday(userId);
  const remainingToday = settings.dailyLimit - appliedToday;
  if (remainingToday <= 0) return stats;

  const toProcess = Math.min(remainingToday, MAX_PER_RUN);

  // Fetch profile for application data
  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.email) {
    // Can't apply without contact info
    return stats;
  }

  const payload: ApplyPayload & { resumeText: string } = {
    fullName: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim(),
    firstName: profile.firstName || profile.fullName.split(" ")[0] || "",
    lastName: profile.lastName || profile.fullName.split(" ").slice(1).join(" ") || "",
    email: profile.email,
    phone: profile.phone || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    resumeUrl: profile.resumeUrl || undefined,
    resumeText: profile.resumeText || "",
  };

  if (settings.coverLetter) {
    payload.coverLetter = settings.coverLetter;
  }

  // Get pending jobs
  const pendingJobs = await db.autoApplyJob.findMany({
    where: { userId, status: "pending" },
    include: { jobListing: true },
    orderBy: { createdAt: "asc" },
    take: toProcess,
  });

  for (const job of pendingJobs) {
    const ats = job.jobListing.atsType.toLowerCase();
    let result: { success: boolean; error?: string };

    if (ats === "lever") {
      result = await applyViaLever(job.jobListing.applyUrl, payload);
    } else if (ats === "greenhouse") {
      result = await applyViaGreenhouse(job.jobListing.applyUrl, {
        ...payload,
        jobTitle: job.jobListing.title,
      });
    } else {
      // Unsupported ATS — skip
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "skipped", error: `ATS not supported: ${ats}` },
      });
      stats.skipped++;
      continue;
    }

    if (result.success) {
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "applied", appliedAt: new Date() },
      });

      // Also create an Application record so it shows in the tracker
      await db.application.upsert({
        where: { id: `auto-${job.id}` },
        create: {
          id: `auto-${job.id}`,
          userId,
          company: job.jobListing.company,
          role: job.jobListing.title,
          url: job.jobListing.applyUrl,
          status: "applied",
          notes: "Auto-applied by Swiftdroom",
          jobDescription: job.jobListing.description,
        },
        update: {},
      });

      await db.autoApplySettings.update({
        where: { userId },
        data: { totalApplied: { increment: 1 } },
      });

      stats.applied++;
    } else {
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "failed", error: result.error || "Unknown error" },
      });
      stats.failed++;
    }

    // Small delay between submissions to avoid rate limits
    await new Promise((r) => setTimeout(r, 1500));
  }

  return stats;
}

/** Main worker entry point — runs for all users with auto-apply enabled. */
export async function runAutoApplyWorker(): Promise<WorkerStats> {
  const stats: WorkerStats = { usersProcessed: 0, applied: 0, failed: 0, skipped: 0 };

  const enabledUsers = await db.autoApplySettings.findMany({
    where: {
      enabled: true,
      OR: [{ pausedUntil: null }, { pausedUntil: { lt: new Date() } }],
    },
    select: { userId: true },
  });

  for (const { userId } of enabledUsers) {
    try {
      // First enqueue new jobs from the current feed
      await enqueueAutoApplyJobs(userId);

      const userStats = await processUser(userId);
      stats.usersProcessed++;
      stats.applied += userStats.applied;
      stats.failed += userStats.failed;
      stats.skipped += userStats.skipped;
    } catch (err) {
      console.error(`Auto-apply worker error for user ${userId}:`, err);
    }
  }

  console.info(
    `Auto-apply worker: ${stats.usersProcessed} users, ${stats.applied} applied, ${stats.failed} failed, ${stats.skipped} skipped`
  );

  return stats;
}
