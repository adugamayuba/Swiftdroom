/**
 * Auto-apply worker — processes the AutoApplyJob queue for all enabled users.
 * Runs every 15 minutes via cron-scheduler.ts. Respects monthly plan limits.
 */

import { db } from "@/lib/db";
import { applyViaLever } from "@/lib/apply-lever";
import { applyViaGreenhouse } from "@/lib/apply-greenhouse";
import { sendAutoApplyDigestEmail } from "@/lib/email";
import { refreshJobFeed } from "@/lib/job-feed";
import { PLANS } from "@/lib/plans";
import type { ApplyPayload } from "@/lib/apply-lever";
import type { SubscriptionPlan } from "@prisma/client";

const SUPPORTED_ATS = ["lever", "greenhouse"];

/** Max jobs processed per run per user (prevents single-run timeouts). */
const MAX_PER_RUN = 8;

export interface WorkerStats {
  usersProcessed: number;
  applied: number;
  failed: number;
  skipped: number;
}

/** Get monthly auto-apply limit for a plan. */
function getMonthlyLimit(plan: SubscriptionPlan): number {
  if (plan === "STARTER") return PLANS.STARTER.autoApplyLimit;
  if (plan === "PRO") return PLANS.PRO.autoApplyLimit;
  if (plan === "BUSINESS") return PLANS.BUSINESS.autoApplyLimit;
  return 0;
}

/**
 * Enqueue new pending auto-apply jobs for a user based on their current feed.
 * Picks "recommended" feed items above minMatchScore that aren't already queued.
 * Guards against duplicate submission at two levels:
 *   1. AutoApplyJob already exists for this (userId, jobListingId)
 *   2. Application record already exists with the same applyUrl
 */
export async function enqueueAutoApplyJobs(userId: string): Promise<number> {
  const settings = await db.autoApplySettings.findUnique({ where: { userId } });
  if (!settings?.enabled) return 0;

  // Existing AutoApplyJob rows that are already pending or successfully applied.
  // "failed" jobs are NOT excluded so they can be retried.
  const existingJobIds = await db.autoApplyJob
    .findMany({ where: { userId, status: { in: ["pending", "applied"] } }, select: { jobListingId: true } })
    .then((rows) => new Set(rows.map((r) => r.jobListingId)));

  // Already-submitted applyUrls from the Application table (manual + auto)
  const submittedUrls = await db.application
    .findMany({ where: { userId }, select: { url: true } })
    .then((rows) => new Set(rows.map((r) => r.url.trim().toLowerCase())));

  // Score filter removed — we queue ALL greenhouse/lever jobs in the feed.
  // The monthly plan limit is the only throttle that matters.
  const feedItems = await db.jobFeedItem.findMany({
    where: {
      userId,
      status: { in: ["recommended", "active", "saved", "clicked"] },
    },
    include: { jobListing: true },
    orderBy: { score: "desc" },
    take: 200,
  });

  const toQueue = feedItems.filter(
    (item) =>
      !existingJobIds.has(item.jobListingId) &&
      !submittedUrls.has(item.jobListing.applyUrl.trim().toLowerCase()) &&
      SUPPORTED_ATS.includes(item.jobListing.atsType.toLowerCase())
  );

  console.info(
    `[auto-apply] enqueue for ${userId}: feedItems=${feedItems.length} eligible=${toQueue.length}`
  );

  if (toQueue.length === 0) return 0;

  // Reset any previously-failed rows back to pending, create new rows for truly new jobs.
  for (const item of toQueue) {
    await db.autoApplyJob.upsert({
      where: { userId_jobListingId: { userId, jobListingId: item.jobListingId } },
      create: {
        userId,
        jobListingId: item.jobListingId,
        atsType: item.jobListing.atsType.toLowerCase(),
        status: "pending",
      },
      update: { status: "pending", error: undefined, appliedAt: null },
    });
  }

  return toQueue.length;
}

/** Count how many applications this user submitted today via auto-apply. */
async function countAppliedToday(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db.autoApplyJob.count({
    where: { userId, status: "applied", appliedAt: { gte: startOfDay } },
  });
}

/** Count how many auto-apply jobs this user has submitted this billing period. */
async function countAppliedThisMonth(
  userId: string,
  periodStart: Date | null
): Promise<number> {
  const since = periodStart ?? new Date(new Date().setDate(1));
  return db.autoApplyJob.count({
    where: { userId, status: "applied", appliedAt: { gte: since } },
  });
}

/** Process pending auto-apply jobs for a single user. */
async function processUser(
  userId: string
): Promise<{ applied: { company: string; role: string }[]; failed: number; skipped: number }> {
  const result = { applied: [] as { company: string; role: string }[], failed: 0, skipped: 0 };

  const [settings, user] = await Promise.all([
    db.autoApplySettings.findUnique({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        currentPeriodStart: true,
        applicationsUsed: true,
        applicationsLimit: true,
        emailNotifyApplications: true,
      },
    }),
  ]);

  if (!settings?.enabled || !user) return result;
  if (settings.pausedUntil && settings.pausedUntil > new Date()) {
    console.info(`[auto-apply] ${userId} is paused until ${settings.pausedUntil.toISOString()}`);
    return result;
  }

  const monthlyLimit = getMonthlyLimit(user.plan);
  if (monthlyLimit === 0) {
    console.info(`[auto-apply] ${userId} has no active plan (plan=${user.plan}), skipping`);
    return result;
  }

  const appliedThisMonth = await countAppliedThisMonth(
    userId,
    user.currentPeriodStart
  );
  const remainingMonthly = monthlyLimit - appliedThisMonth;
  if (remainingMonthly <= 0) return result;

  const appliedToday = await countAppliedToday(userId);
  // Hardcoded daily cap — roughly 1/10 of monthly limit, min 5
  const dailyCap = Math.max(5, Math.ceil(monthlyLimit / 10));
  const remainingToday = dailyCap - appliedToday;
  if (remainingToday <= 0) return result;

  const toProcess = Math.min(remainingToday, remainingMonthly, MAX_PER_RUN);

  const profile = await db.profile.findUnique({ where: { userId } });
  if (!profile?.email) {
    console.warn(`[auto-apply] ${userId} has no profile email, skipping`);
    return result;
  }

  const payload: ApplyPayload & { resumeText: string } = {
    fullName:
      profile.fullName ||
      `${profile.firstName} ${profile.lastName}`.trim() ||
      profile.email.split("@")[0],
    firstName:
      profile.firstName || profile.fullName?.split(" ")[0] || "",
    lastName:
      profile.lastName ||
      profile.fullName?.split(" ").slice(1).join(" ") ||
      "",
    email: profile.email,
    phone: profile.phone || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    resumeUrl: profile.resumeUrl || undefined,
    resumeText: profile.resumeText || "",
    coverLetter: settings.coverLetter || undefined,
  };

  const pendingJobs = await db.autoApplyJob.findMany({
    where: { userId, status: "pending" },
    include: { jobListing: true },
    orderBy: { createdAt: "asc" },
    take: toProcess,
  });

  for (const job of pendingJobs) {
    const ats = job.jobListing.atsType.toLowerCase();
    let applyResult: { success: boolean; error?: string };

    // Extra guard: don't apply if Application already exists with this URL
    const alreadyApplied = await db.application.findFirst({
      where: {
        userId,
        url: { equals: job.jobListing.applyUrl, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (alreadyApplied) {
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "skipped", error: "Already applied to this job" },
      });
      result.skipped++;
      continue;
    }

    if (ats === "lever") {
      applyResult = await applyViaLever(job.jobListing.applyUrl, payload);
    } else if (ats === "greenhouse") {
      applyResult = await applyViaGreenhouse(job.jobListing.applyUrl, {
        ...payload,
        jobTitle: job.jobListing.title,
      });
    } else {
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "skipped", error: `ATS not supported: ${ats}` },
      });
      result.skipped++;
      continue;
    }

    if (applyResult.success) {
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "applied", appliedAt: new Date() },
      });

      // Record in the application tracker
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

      // Increment usage counter
      await db.user.update({
        where: { id: userId },
        data: { applicationsUsed: { increment: 1 } },
      });

      result.applied.push({
        company: job.jobListing.company,
        role: job.jobListing.title,
      });
    } else {
      const errMsg = applyResult.error || "Unknown error";
      console.warn(`[auto-apply] FAILED ${ats} — ${job.jobListing.company} "${job.jobListing.title}": ${errMsg}`);
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "failed", error: errMsg },
      });
      result.failed++;
    }

    await new Promise((r) => setTimeout(r, 1200));
  }

  // Send email digest if anything was applied
  if (result.applied.length > 0 && user.emailNotifyApplications) {
    const updatedSettings = await db.autoApplySettings.findUnique({
      where: { userId },
    });
    sendAutoApplyDigestEmail(
      { email: user.email, name: user.name },
      result.applied,
      result.failed,
      updatedSettings?.totalApplied ?? result.applied.length,
      monthlyLimit
    ).catch((err) => console.error("[auto-apply] email digest error:", err));
  }

  return result;
}

/** Main worker entry point — runs for all users with auto-apply enabled. */
export async function runAutoApplyWorker(): Promise<WorkerStats> {
  const stats: WorkerStats = {
    usersProcessed: 0,
    applied: 0,
    failed: 0,
    skipped: 0,
  };

  const enabledUsers = await db.autoApplySettings.findMany({
    where: {
      enabled: true,
      OR: [{ pausedUntil: null }, { pausedUntil: { lt: new Date() } }],
    },
    select: { userId: true },
  });

  if (enabledUsers.length === 0) return stats;

  console.info(`[auto-apply] ${enabledUsers.length} user(s) with auto-apply enabled`);

  for (const { userId } of enabledUsers) {
    try {
      // Refresh job feed first so there are jobs to queue even if user hasn't
      // visited the Jobs page. refreshJobFeed has its own 15-min cooldown.
      const userWithProfile = await db.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });
      if (userWithProfile) {
        const feedResult = await refreshJobFeed(userWithProfile);
        if (feedResult.added > 0) {
          console.info(`[auto-apply] feed refresh for ${userId}: +${feedResult.added} jobs`);
        }
      }

      const queued = await enqueueAutoApplyJobs(userId);
      if (queued > 0) {
        console.info(`[auto-apply] queued ${queued} jobs for ${userId}`);
      }

      const userResult = await processUser(userId);
      stats.usersProcessed++;
      stats.applied += userResult.applied.length;
      stats.failed += userResult.failed;
      stats.skipped += userResult.skipped;
    } catch (err) {
      console.error(`[auto-apply] worker error for user ${userId}:`, err);
    }
  }

  if (stats.usersProcessed > 0) {
    console.info(
      `[auto-apply] ${stats.usersProcessed} users · ${stats.applied} applied · ${stats.failed} failed · ${stats.skipped} skipped`
    );
  }

  return stats;
}
