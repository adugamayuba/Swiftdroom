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
import { completeWithSecurityCode } from "@/lib/apply-greenhouse";
import { sendEmail } from "@/lib/email";
import type { ApplyPayload } from "@/lib/apply-lever";

const SWIFTDROOM_DOMAIN = "@swiftdroom.com";

// ---------- Verification code extraction ----------

/**
 * Extract a Greenhouse-style security code from an email body.
 * Greenhouse codes appear to be 4–6 digit or short alphanumeric strings.
 * We try increasingly broad patterns; the last resort grabs any standalone
 * 4+ digit number, which is what Greenhouse typically sends.
 */
function extractVerificationCode(subject: string, body: string): string | null {
  // Normalise whitespace (newlines, nbsp, tabs → space)
  const text = `${subject}\n${body}`
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ");

  const patterns = [
    // Explicit label patterns
    /security code[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /verification code[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /your code[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /code is[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /enter[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /use[^a-z0-9]*code[^a-z0-9]*([A-Z0-9]{4,10})/i,
    /code[^a-z0-9]*([A-Z0-9]{4,10})/i,
    // Standalone number on its own line / surrounded by spaces
    /(?:^|\s)([0-9]{4,8})(?:\s|$)/,
    // Any 4–8 digit sequence as absolute last resort
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
  code: string
): Promise<void> {
  // Find the most recent job awaiting a security code for this user
  const job = await db.autoApplyJob.findFirst({
    where: { userId, status: "failed", error: "security_code_required" },
    include: { jobListing: true },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    console.info(`[email-imap] no pending-code job for user ${userId}`);
    return;
  }

  const [profile, settings] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.autoApplySettings.findUnique({ where: { userId } }),
  ]);

  if (!profile?.email) return;

  // Use the user's real email in the application (the swiftdroom alias was used only to
  // receive the code; the actual application should have their real email if possible,
  // or the swiftdroom alias for consistency — keep swiftdroom alias here)
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { swiftdroomEmail: true },
  });

  const payload: ApplyPayload & { resumeText: string; jobTitle: string; externalId?: string } = {
    fullName:
      profile.fullName ||
      `${profile.firstName} ${profile.lastName}`.trim() ||
      profile.email.split("@")[0],
    firstName: profile.firstName || profile.fullName?.split(" ")[0] || "",
    lastName: profile.lastName || profile.fullName?.split(" ").slice(1).join(" ") || "",
    email: user?.swiftdroomEmail ?? profile.email,
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
      },
      update: {},
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
    console.warn(`[email-imap] code completion failed: ${result.error}`);
    await db.autoApplyJob.update({
      where: { id: job.id },
      data: { error: result.error ?? "Code verification failed" },
    });
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

      await db.inboxEmail.create({
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
        },
      });

      console.info(`[email-imap] stored email for ${toAlias}: "${subject}" from ${fromEmail}`);

      if (isVerificationEmail(subject)) {
        const code = extractVerificationCode(subject, bodyText);
        if (code) {
          console.info(`[email-imap] found code "${code}" for ${toAlias}`);
          await autoCompleteApplication(targetUser.id, code);
        } else {
          // Log first 400 chars of body so we can update the regex to match
          const preview = bodyText.replace(/\s+/g, " ").trim().slice(0, 400);
          console.warn(`[email-imap] no code found for ${toAlias} — subject: "${subject}" — body preview: "${preview}"`);
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
