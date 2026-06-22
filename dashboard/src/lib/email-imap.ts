/**
 * IMAP poller for the Swiftdroom catch-all inbox (hi@swiftdroom.com).
 *
 * Every 2 minutes this runs and:
 * 1. Connects to Titan Mail via IMAP
 * 2. Fetches all UNSEEN messages
 * 3. Routes each email to the correct user by matching the To: alias
 * 4. Stores the email in InboxEmail table
 * 5. Detects Greenhouse/Lever verification codes and auto-completes applications
 * 6. Notifies users via their real email
 *
 * Required env vars:
 *   IMAP_HOST     — e.g. imap.titan.email
 *   IMAP_USER     — hi@swiftdroom.com
 *   IMAP_PASS     — mailbox password
 */

import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { completeWithSecurityCode } from "@/lib/apply-greenhouse";
import { sendEmail } from "@/lib/email";
import { PLANS } from "@/lib/plans";
import type { ApplyPayload } from "@/lib/apply-lever";
import type { SubscriptionPlan } from "@prisma/client";

function getMonthlyAutoApplyLimit(plan: SubscriptionPlan): number {
  if (plan === "STARTER") return PLANS.STARTER.autoApplyLimit;
  if (plan === "PRO") return PLANS.PRO.autoApplyLimit;
  if (plan === "BUSINESS") return PLANS.BUSINESS.autoApplyLimit;
  return 0;
}

async function countAppliedThisMonth(userId: string, periodStart: Date | null): Promise<number> {
  const since = periodStart ?? new Date(new Date().setDate(1));
  return db.autoApplyJob.count({
    where: { userId, status: "applied", appliedAt: { gte: since } },
  });
}

const SWIFTDROOM_DOMAIN = "@swiftdroom.com";

// ---------- Verification code extraction ----------

/** Strip HTML tags and decode common entities to get searchable plain text */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract a Greenhouse-style security code from an email body.
 *
 * Confirmed Greenhouse format:
 *   "Copy and paste this code into the security code field on your application: 2KnHTQsO After you enter..."
 *
 * The code is alphanumeric (mixed case), 4–12 chars, always after a colon.
 * Patterns are ordered from most-specific to least-specific to avoid
 * matching common words like "field" or "code".
 */
function extractVerificationCode(subject: string, bodyText: string, bodyHtml: string): string | null {
  const plain = bodyText.trim() || htmlToText(bodyHtml);
  const text = `${subject}\n${plain}`.replace(/\s+/g, " ");

  const patterns = [
    // Greenhouse specific: "...your application: CODE After..."
    /application:\s+([A-Za-z0-9]{4,12})(?:\s|$)/i,
    // "code: CODE" — colon immediately after "code"
    /\bcode\s*:\s*([A-Za-z0-9]{4,12})\b/i,
    /security code\s*:\s*([A-Za-z0-9]{4,12})\b/i,
    /verification code\s*:\s*([A-Za-z0-9]{4,12})\b/i,
    /your code\s*(?:is\s*)?:\s*([A-Za-z0-9]{4,12})\b/i,
    // Any colon followed by a standalone token (generic fallback)
    /:\s+([A-Za-z0-9]{6,12})(?:\s|$)/,
    // Pure numeric codes — other ATS systems
    /\b([0-9]{4,8})\b/,
  ];

  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

function isVerificationEmail(subject: string): boolean {
  const s = subject.toLowerCase();
  return (
    s.includes("security code") ||          // "Security code for your application..."
    s.includes("verification code") ||
    s.includes("verify your application") ||
    s.includes("application code") ||
    s.includes("confirm your application") ||
    s.includes("your code") ||
    s.includes("access code")
  );
}

// ---------- Auto-complete pending applications ----------

async function autoCompleteApplication(
  userId: string,
  code: string,
  companyHint?: string
): Promise<void> {
  // Build where clause — filter by company if we extracted a hint from the email subject.
  // e.g. "Security code for your application to Product People"
  //
  // Greenhouse email uses the display name ("Product People") but the DB stores the
  // URL board token ("productpeople"). We match on multiple normalised forms so both work:
  //   - original:  "Product People"  → company contains "Product People"
  //   - slug:      "productpeople"   → company contains "productpeople"
  //   - first word: "Product"        → company contains "product" (loose fallback)
  let companyFilter: object = {};
  if (companyHint) {
    const slug = companyHint.toLowerCase().replace(/\s+/g, "");
    const firstWord = companyHint.split(/\s+/)[0];
    companyFilter = {
      jobListing: {
        company: {
          in: [companyHint, slug, firstWord, companyHint.toLowerCase()],
          mode: "insensitive" as const,
        },
      },
    };
    // Prisma `in` is exact-match. Fall back to OR contains for partial matching.
    companyFilter = {
      jobListing: {
        OR: [
          { company: { contains: companyHint,            mode: "insensitive" as const } },
          { company: { contains: slug,                   mode: "insensitive" as const } },
          { company: { contains: firstWord,              mode: "insensitive" as const } },
        ],
      },
    };
  }

  const baseWhere = { userId, status: "failed", error: "security_code_required" };
  // When a companyFilter is present, try narrowed search first, fall back to all pending-code jobs.
  // Order by updatedAt DESC — the job most recently marked security_code_required is the one
  // whose code email just arrived. Trying newer jobs first reduces wrong-code rejections.
  let jobs = await db.autoApplyJob.findMany({
    where: Object.keys(companyFilter).length
      ? { ...baseWhere, ...(companyFilter as object) }
      : baseWhere,
    include: { jobListing: true },
    orderBy: { updatedAt: "desc" },
    take: 3,
  });

  // If the company filter returned nothing, widen to all pending-code jobs for this user
  // (avoids losing a valid code just because of a name-format mismatch)
  if (jobs.length === 0 && Object.keys(companyFilter).length > 0) {
    console.info(`[email-imap] company filter found 0 jobs for "${companyHint}", widening search`);
    jobs = await db.autoApplyJob.findMany({
      where: baseWhere,
      include: { jobListing: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    });
  }

  if (jobs.length === 0) {
    console.info(`[email-imap] no pending-code jobs for user ${userId}`);
    return;
  }

  for (const job of jobs) {
    await attemptComplete(userId, job, code);
    // Re-check if this job was successfully applied (stop looping if it was)
    const updated = await db.autoApplyJob.findUnique({
      where: { id: job.id },
      select: { status: true },
    });
    if (updated?.status === "applied") return;
    // Short pause between attempts to avoid rapid-fire requests to the same board
    await new Promise((r) => setTimeout(r, 2000));
  }
}

type AutoApplyJobWithListing = Awaited<ReturnType<typeof db.autoApplyJob.findMany<{include: {jobListing: true}}>>>[number];

async function attemptComplete(
  userId: string,
  job: AutoApplyJobWithListing,
  code: string
): Promise<void> {

  const [profile, settings, userRecord] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.autoApplySettings.findUnique({ where: { userId } }),
    db.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
        subscriptionStatus: true,
        currentPeriodStart: true,
        swiftdroomEmail: true,
      },
    }),
  ]);

  if (!profile?.email) return;

  // Enforce subscription limit — same logic as auto-apply-worker
  if (!userRecord || userRecord.subscriptionStatus !== "ACTIVE" && userRecord.subscriptionStatus !== "TRIALING") {
    console.warn(`[email-imap] user ${userId} has no active subscription — skipping auto-complete`);
    return;
  }
  const monthlyLimit = getMonthlyAutoApplyLimit(userRecord.plan);
  if (monthlyLimit === 0) {
    console.warn(`[email-imap] user ${userId} plan=${userRecord.plan} has no auto-apply limit`);
    return;
  }
  const appliedThisMonth = await countAppliedThisMonth(userId, userRecord.currentPeriodStart);
  if (appliedThisMonth >= monthlyLimit) {
    console.warn(
      `[email-imap] user ${userId} has reached monthly limit (${appliedThisMonth}/${monthlyLimit}) — skipping`
    );
    return;
  }

  const payload: ApplyPayload & { resumeText: string; jobTitle: string; externalId?: string } = {
    fullName:
      profile.fullName ||
      `${profile.firstName} ${profile.lastName}`.trim() ||
      profile.email.split("@")[0],
    firstName: profile.firstName || profile.fullName?.split(" ")[0] || "",
    lastName: profile.lastName || profile.fullName?.split(" ").slice(1).join(" ") || "",
    email: userRecord.swiftdroomEmail ?? profile.email,
    phone: profile.phone || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    resumeUrl: profile.resumeUrl || undefined,
    resumeText: profile.resumeText || "",
    jobTitle: job.jobListing.title,
    externalId: job.jobListing.externalId,
    coverLetter: settings?.coverLetter || undefined,
  };

  console.info(
    `[email-imap] auto-completing ${job.jobListing.company} "${job.jobListing.title}" for user ${userId}`
  );

  const result = await completeWithSecurityCode(job.jobListing.applyUrl, payload, code);

  if (result.success) {
    await db.autoApplyJob.update({
      where: { id: job.id },
      data: { status: "applied", appliedAt: new Date(), error: undefined },
    });
    await db.application.upsert({
      where: { id: `auto-${job.id}` },
      create: {
        id: `auto-${job.id}`,
        userId,
        company: job.jobListing.company,
        role: job.jobListing.title,
        url: job.jobListing.applyUrl,
        status: "applied",
        notes: "Auto-applied via Swiftdroom",
        jobDescription: job.jobListing.description,
        submittedAnswers: result.submittedData
          ? (result.submittedData as unknown as Prisma.InputJsonValue)
          : undefined,
      },
      update: {
        submittedAnswers: result.submittedData
          ? (result.submittedData as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
    await db.autoApplySettings.update({
      where: { userId },
      data: { totalApplied: { increment: 1 } },
    });
    await db.user.update({
      where: { id: userId },
      data: { applicationsUsed: { increment: 1 } },
    });
    console.info(
      `[email-imap] ✓ applied to ${job.jobListing.company} "${job.jobListing.title}"`
    );
  } else {
    const errMsg = result.error ?? "Code verification failed";
    const isWrongJob =
      errMsg.toLowerCase().includes("invalid-security-code") ||
      errMsg.toLowerCase().includes("incorrect security code");
    const isJobClosed = errMsg === "Job closed";

    if (isWrongJob) {
      // Code belongs to a different job — leave this job as security_code_required
      // so it can be completed when its own code email arrives.
      console.info(
        `[email-imap] code rejected by ${job.jobListing.company}/${job.jobListing.externalId} — keeping as pending-code`
      );
    } else if (isJobClosed) {
      // Position was filled — permanently skip it.
      console.warn(`[email-imap] ${job.jobListing.company} job closed during completion`);
      await db.autoApplyJob.update({
        where: { id: job.id },
        data: { status: "skipped", error: "Job closed" },
      });
    } else {
      // Transient failure (captcha, 422, network) — keep status as security_code_required
      // so the next poller cycle can retry with the same or a fresh code. Log the real
      // error so it's visible in server logs without confusing the user's queue view.
      console.warn(`[email-imap] code completion failed for ${job.jobListing.company}: ${errMsg} — will retry`);
      // status unchanged — job stays in the "Processing" bucket in the UI
    }
  }
}

// ---------- Email notification ----------

async function notifyUser(
  userEmail: string,
  userName: string | null,
  fromEmail: string,
  fromName: string,
  subject: string,
  swiftdroomAlias: string
): Promise<void> {
  try {
    await sendEmail({
      to: userEmail,
      subject: `New message in your Swiftdroom inbox: "${subject}"`,
      text: [
        `Hi ${userName ?? "there"},`,
        "",
        `You received a new email at ${swiftdroomAlias}:`,
        `From: ${fromName ? `${fromName} <${fromEmail}>` : fromEmail}`,
        `Subject: ${subject}`,
        "",
        `View it in your Swiftdroom inbox:`,
        `https://swiftdroom-production.up.railway.app/dashboard/inbox`,
      ].join("\n"),
    });
  } catch (err) {
    console.error("[email-imap] notification error:", err);
  }
}

// ---------- Main poll function ----------

let polling = false;

export async function pollInboxEmails(): Promise<void> {
  if (polling) return;
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!host || !user || !pass) return;

  polling = true;

  // --- Retry saved codes from previous polls that had no matching job yet ---
  // Covers the race condition where the code email arrives before the worker
  // marks the job as security_code_required (both run concurrently).
  try {
    // Greenhouse security codes expire in ~3-5 minutes — only retry within that window.
    const fourMinAgo = new Date(Date.now() - 4 * 60 * 1000);
    const savedCodes = await db.inboxEmail.findMany({
      where: {
        isVerification: true,
        pendingCode: { not: null },
        createdAt: { gte: fourMinAgo },
      },
      select: { id: true, userId: true, subject: true, pendingCode: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    for (const row of savedCodes) {
      if (!row.pendingCode) continue;
      const companyMatch = row.subject.match(/application to (.+?)(?:\s*$)/i);
      const companyHint = companyMatch?.[1]?.trim();
      // Check if any security_code_required jobs exist for this user now
      const hasPending = await db.autoApplyJob.count({
        where: { userId: row.userId, status: "failed", error: "security_code_required" },
      });
      if (hasPending > 0) {
        console.info(`[email-imap] retrying saved code "${row.pendingCode}" for user ${row.userId}`);
        await autoCompleteApplication(row.userId, row.pendingCode, companyHint);
        // Always clear after one retry — code is either consumed or expired
        await db.inboxEmail.update({ where: { id: row.id }, data: { pendingCode: null } });
      } else {
        // No pending jobs left — clear the stale code
        await db.inboxEmail.update({ where: { id: row.id }, data: { pendingCode: null } });
      }
    }
  } catch (retryErr) {
    console.error("[email-imap] saved-code retry error:", retryErr);
  }

  // Collect raw email buffers while IMAP is connected, then
  // disconnect immediately before doing any slow DB work.
  // This prevents Titan Mail's idle timeout from killing the socket mid-loop.
  const rawBuffers: Buffer[] = [];

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30000,
    connectionTimeout: 15000,
  } as ConstructorParameters<typeof ImapFlow>[0]);

  // Absorb socket-level errors so they never become uncaughtExceptions
  client.on("error", (err: Error) => {
    console.error("[email-imap] socket error:", err.message);
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      const searchResult = await client.search({ seen: false });
      const uids = (Array.isArray(searchResult) ? searchResult : []) as number[];

      if (uids.length === 0) {
        lock.release();
        await client.logout();
        polling = false;
        return;
      }

      console.info(`[email-imap] ${uids.length} new message(s) — fetching into memory`);

      // Slurp all message sources into memory as fast as possible
      for await (const msg of client.fetch(uids, { source: true, uid: true })) {
        if (msg.source) rawBuffers.push(Buffer.from(msg.source));
      }

      // Bulk mark ALL as seen before disconnecting so they never reappear
      await client.messageFlagsAdd(uids, ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("[email-imap] fetch error:", err);
    polling = false;
    try { await client.logout(); } catch { /* ignore */ }
    return;
  }

  // Disconnect IMAP now — all subsequent work is DB-only
  try { await client.logout(); } catch { /* ignore */ }

  // ── Phase 2: parse + DB work with no open IMAP connection ──────────────
  for (const buf of rawBuffers) {
    try {
      const parsed: ParsedMail = await simpleParser(buf);

      // Find the @swiftdroom.com recipient
      const toAddresses = parsed.to
        ? Array.isArray(parsed.to) ? parsed.to.flatMap((a) => a.value) : parsed.to.value
        : [];
      const toAlias = toAddresses
        .map((a) => a.address?.toLowerCase() ?? "")
        .find((a) => a.endsWith(SWIFTDROOM_DOMAIN));

      if (!toAlias) continue; // not addressed to a swiftdroom alias

      const targetUser = await db.user.findUnique({
        where: { swiftdroomEmail: toAlias },
        select: { id: true, email: true, name: true },
      });

      if (!targetUser) {
        console.warn(`[email-imap] no user for alias ${toAlias}`);
        continue;
      }

      const fromAddress = parsed.from?.value?.[0];
      const fromEmail = fromAddress?.address ?? "";
      const fromName = fromAddress?.name ?? "";
      const subject = typeof parsed.subject === "string" ? parsed.subject : "";
      const bodyText = typeof parsed.text === "string" ? parsed.text : "";
      const bodyHtml = typeof parsed.html === "string" ? parsed.html : "";
      // Dedup key: host + sender + subject + date
      const imapUid = `${host}:${fromEmail}:${subject}:${parsed.date?.toISOString() ?? ""}`;

      const existing = await db.inboxEmail.findFirst({ where: { imapUid }, select: { id: true } });
      if (existing) continue;

      const isVerification = isVerificationEmail(subject);

      const storedEmail = await db.inboxEmail.create({
        data: {
          userId: targetUser.id,
          toAlias,
          fromEmail,
          fromName,
          subject,
          bodyText: bodyText.slice(0, 50000),
          bodyHtml: bodyHtml.slice(0, 100000),
          imapUid,
          receivedAt: parsed.date ?? new Date(),
          isVerification,
        },
        select: { id: true },
      });

      console.info(
        `[email-imap] stored email for ${toAlias}: "${subject}" from ${fromEmail}${isVerification ? " [verification — hidden from inbox]" : ""}`
      );

      if (isVerification) {
        const code = extractVerificationCode(subject, bodyText, bodyHtml);
        if (code) {
          // Extract company hint from subject: "Security code for your application to Discord"
          const companyMatch = subject.match(/application to (.+?)(?:\s*$)/i);
          const companyHint = companyMatch?.[1]?.trim();
          console.info(`[email-imap] found code "${code}" for ${toAlias}${companyHint ? ` (company: ${companyHint})` : ""}`);

          // Save the code on the InboxEmail row so it can be retried if no job is
          // ready yet (race: code email arrives before worker marks job as security_code_required).
          await db.inboxEmail.update({
            where: { id: storedEmail.id },
            data: { pendingCode: code },
          });

          await autoCompleteApplication(targetUser.id, code, companyHint);
        } else {
          const strippedPreview = (bodyText.trim() || htmlToText(bodyHtml)).slice(0, 400);
          console.warn(`[email-imap] no code found for ${toAlias} — subject: "${subject}" — text: "${strippedPreview}"`);
        }
      } else {
        await notifyUser(targetUser.email, targetUser.name, fromEmail, fromName, subject, toAlias);
      }
    } catch (itemErr) {
      console.error("[email-imap] item processing error:", itemErr);
    }
  }

  polling = false;
}
