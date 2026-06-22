/**
 * Auto-apply worker — processes the AutoApplyJob queue for all enabled users.
 * Runs every 15 minutes via cron-scheduler.ts. Respects monthly plan limits.
 */

import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyViaLever } from "@/lib/apply-lever";
import { applyViaGreenhouse } from "@/lib/apply-greenhouse";
import { sendAutoApplyDigestEmail } from "@/lib/email";
import { refreshJobFeed } from "@/lib/job-feed";
import { PLANS } from "@/lib/plans";
import { getOrAssignSwiftdroomEmail } from "@/lib/user-swiftdroom-email";
import type { ApplyPayload } from "@/lib/apply-lever";
import type { SubscriptionPlan } from "@prisma/client";

const SUPPORTED_ATS = ["lever", "greenhouse"];

/** Max jobs processed per run per user (prevents single-run timeouts). */
const MAX_PER_RUN = 15;

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

  // Only reset transient skips (rate-limit / captcha fallback) back to pending.
  // "Job closed" is permanent — never reset it, or the worker retries it every 15 minutes.
  await db.autoApplyJob.updateMany({
    where: {
      userId,
      status: "skipped",
      error: { in: ["Rate limited — will retry", "Captcha failed — will retry"] },
    },
    data: { status: "pending", error: undefined },
  });

  // Reset failed jobs whose code was tried on the wrong job — now that company-hint
  // matching is in place, resubmitting will generate fresh codes correctly routed.
  await db.autoApplyJob.updateMany({
    where: {
      userId,
      status: "failed",
      error: { in: ["Incorrect security code", "Code verification failed"] },
    },
    data: { status: "pending", error: undefined },
  });

  // Reset "security_code_required" failed jobs older than 25 minutes back to pending.
  // The IMAP poller only matches codes to jobs updated within the last 20 minutes, so
  // anything older than 25 min will never get a code matched — re-submit to get a fresh code.
  // Use updatedAt (not createdAt) since we care about when the code was last requested.
  const twentyFiveMinAgo = new Date(Date.now() - 25 * 60 * 1000);
  const resetResult = await db.autoApplyJob.updateMany({
    where: {
      userId,
      status: "failed",
      error: "security_code_required",
      updatedAt: { lt: twentyFiveMinAgo },
    },
    data: { status: "pending", error: undefined },
  });
  if (resetResult.count > 0) {
    console.info(`[auto-apply] reset ${resetResult.count} stale security-code job(s) to pending for ${userId}`);
  }

  // Purge stale FAILED jobs only — keeps the queue clean from transient errors.
  // SKIPPED jobs ("Job closed") must be kept forever: they act as the blacklist
  // that prevents closed Greenhouse/Lever jobs from being re-queued on every cycle.
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await db.autoApplyJob.deleteMany({
    where: {
      userId,
      updatedAt: { lt: sevenDaysAgo },
      status: "failed",
    },
  });

  // Existing AutoApplyJob rows that are already pending or successfully applied or truly skipped.
  // "failed" jobs are NOT excluded so they can be retried on transient errors.
  const existingJobIds = await db.autoApplyJob
    .findMany({ where: { userId, status: { in: ["pending", "applied", "skipped"] } }, select: { jobListingId: true } })
    .then((rows) => new Set(rows.map((r) => r.jobListingId)));

  // Already-submitted applyUrls from the Application table (manual + auto)
  const submittedUrls = await db.application
    .findMany({ where: { userId }, select: { url: true } })
    .then((rows) => new Set(rows.map((r) => r.url.trim().toLowerCase())));

  // Get user's target role from their persona or preferences for relevance filtering
  const [persona, prefs] = await Promise.all([
    db.persona.findFirst({ where: { userId, isDefault: true } }),
    db.jobSearchPreference.findUnique({ where: { userId } }),
  ]);
  const targetRole = persona?.focus || prefs?.targetRole || "";
  const keywords = targetRole
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 3);

  // Query JobListing directly. Two key filters:
  // 1. Only recent records (last 72h) — old/stale jobs have likely closed
  // 2. Only jobs with hosted Greenhouse board URLs (boards.greenhouse.io /
  //    job-boards.greenhouse.io) — companies with custom career pages (mongodb.com/careers,
  //    datadoghq.com etc.) have disabled the application API; all submissions 404.
  //    Lever jobs always have API-accessible apply endpoints.
  const recentSince = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const keywordOr = keywords.length > 0
    ? keywords.map((kw) => ({ title: { contains: kw, mode: "insensitive" as const } }))
    : null;

  // Fetch greenhouse and lever listings separately so we can put greenhouse first.
  // Greenhouse submissions are fully automated end-to-end (including code verification),
  // so we prioritise them to maximise the success rate for each run.
  const greenhouseWhere = {
    updatedAt: { gte: recentSince },
    ...(keywordOr ? { OR: keywordOr } : {}),
    AND: [
      {
        OR: [
          { applyUrl: { contains: "boards.greenhouse.io/" } },
          { applyUrl: { contains: "job-boards.greenhouse.io/" } },
        ],
      },
    ],
  };
  const leverWhere = {
    updatedAt: { gte: recentSince },
    ...(keywordOr ? { OR: keywordOr } : {}),
    atsType: "lever" as const,
  };

  const [ghListings, leverListings] = await Promise.all([
    db.jobListing.findMany({ where: greenhouseWhere, orderBy: { postedAt: "desc" }, take: 400 }),
    db.jobListing.findMany({ where: leverWhere,      orderBy: { postedAt: "desc" }, take: 100 }),
  ]);
  // Greenhouse first, lever fills remaining capacity
  const listings = [...ghListings, ...leverListings];

  const toQueue = listings.filter(
    (l) =>
      !existingJobIds.has(l.id) &&
      !submittedUrls.has(l.applyUrl.trim().toLowerCase())
  );

  console.info(
    `[auto-apply] enqueue for ${userId}: listings=${listings.length} eligible=${toQueue.length} role="${targetRole}"`
  );

  if (toQueue.length === 0) return 0;

  // Reset any previously-failed rows back to pending, create new rows for truly new jobs.
  for (const listing of toQueue) {
    await db.autoApplyJob.upsert({
      where: { userId_jobListingId: { userId, jobListingId: listing.id } },
      create: {
        userId,
        jobListingId: listing.id,
        atsType: listing.atsType.toLowerCase(),
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

  // Get (or create) the user's dedicated @swiftdroom.com alias.
  // Applications are submitted with this address so Greenhouse/Lever sends
  // verification codes to a mailbox we control — enabling fully automatic code retrieval.
  const swiftdroomEmail = await getOrAssignSwiftdroomEmail(userId);

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
    email: swiftdroomEmail,
    phone: profile.phone || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    resumeUrl: profile.resumeUrl || undefined,
    resumeText: profile.resumeText || "",
    coverLetter: settings.coverLetter || undefined,
  };

  // Fetch pending jobs — greenhouse first (proven submissions), then lever, then others.
  // Over-fetch slightly so we can re-sort in-process without under-filling the batch.
  const [ghJobs, otherJobs] = await Promise.all([
    db.autoApplyJob.findMany({
      where: { userId, status: "pending", atsType: "greenhouse" },
      include: { jobListing: true },
      orderBy: { createdAt: "asc" },
      take: toProcess,
    }),
    db.autoApplyJob.findMany({
      where: { userId, status: "pending", atsType: { not: "greenhouse" } },
      include: { jobListing: true },
      orderBy: { createdAt: "asc" },
      take: toProcess,
    }),
  ]);
  // Fill the batch: as many greenhouse as available, then fill remainder with others
  const pendingJobs = [...ghJobs, ...otherJobs].slice(0, toProcess);

  console.info(
    `[auto-apply] processing ${pendingJobs.length} pending job(s) for ${userId} using ${swiftdroomEmail}`
  );

  // Track companies throttled this run — skip any further jobs from them to avoid
  // burning CAPTCHA budget on requests that will just return 429 immediately.
  const throttledCompanies = new Set<string>();

  for (const job of pendingJobs) {
    const ats = job.jobListing.atsType.toLowerCase();
    const company = job.jobListing.company.toLowerCase();
    let applyResult: import("@/lib/apply-lever").ApplyResult;

    // Skip this company if it rate-limited us earlier in this run
    if (throttledCompanies.has(company)) {
      console.info(`[auto-apply] skipping ${job.jobListing.company} — throttled this run`);
      continue;
    }

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
        externalId: job.jobListing.externalId,
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
          submittedAnswers: applyResult.submittedData
            ? (applyResult.submittedData as unknown as Prisma.InputJsonValue)
            : undefined,
        },
        update: {
          submittedAnswers: applyResult.submittedData
            ? (applyResult.submittedData as unknown as Prisma.InputJsonValue)
            : undefined,
        },
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
      const isClosedJob = errMsg === "Job closed";
      const needsSecurityCode = applyResult.securityCodeRequired === true;

      if (needsSecurityCode) {
        // Greenhouse sent a code to the user's email — mark as awaiting verification
        console.info(
          `[auto-apply] VERIFY ${ats} — ${job.jobListing.company} "${job.jobListing.title}": code sent to user email`
        );
        await db.autoApplyJob.update({
          where: { id: job.id },
          data: { status: "failed", error: "security_code_required" },
        });
        result.failed++;
      } else {
        console.warn(
          `[auto-apply] ${isClosedJob ? "CLOSED" : "FAILED"} ${ats} — ${job.jobListing.company} "${job.jobListing.title}": ${errMsg}`
        );
        await db.autoApplyJob.update({
          where: { id: job.id },
          data: { status: isClosedJob ? "skipped" : "failed", error: errMsg },
        });
        if (isClosedJob) result.skipped++;
        else result.failed++;
      }
    }

    // Respect ATS rate limits:
    // - 429/throttle: mark company as blocked for this run, wait 15s
    // - security_code: no extra wait needed
    // - normal: 2.5s between jobs (up from 1.5s — reduces per-company throttling)
    const isRateLimited = !applyResult.success && applyResult.error?.includes("Rate limited");
    if (isRateLimited) {
      throttledCompanies.add(company);
      console.info(`[auto-apply] ${job.jobListing.company} throttled — skipping rest of company this run`);
    }
    const delay = isRateLimited ? 15000 : 2500;
    await new Promise((r) => setTimeout(r, delay));
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
