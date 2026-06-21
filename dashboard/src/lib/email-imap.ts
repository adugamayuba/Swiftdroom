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
 * Greenhouse codes are typically 4–8 character alphanumeric strings.
 */
function extractVerificationCode(subject: string, body: string): string | null {
  const text = `${subject}\n${body}`;
  const patterns = [
    /security code[:\s]+([A-Z0-9]{4,10})/i,
    /verification code[:\s]+([A-Z0-9]{4,10})/i,
    /your code[:\s]+([A-Z0-9]{4,10})/i,
    /code is[:\s]+([A-Z0-9]{4,10})/i,
    /enter code[:\s]+([A-Z0-9]{4,10})/i,
    /\b([0-9]{5,8})\b/, // 5–8 digit fallback
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
    s.includes("security code") ||
    s.includes("verification code") ||
    s.includes("verify your application") ||
    s.includes("application code") ||
    s.includes("confirm your application")
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
  if (polling) return; // Prevent overlapping runs
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  if (!host || !user || !pass) {
    // Silently skip if IMAP not configured
    return;
  }

  polling = true;
  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Fetch all UNSEEN messages
      const searchResult = await client.search({ seen: false });
      const messages = Array.isArray(searchResult) ? searchResult : [];
      if (messages.length === 0) {
        return;
      }

      console.info(`[email-imap] ${messages.length} new message(s)`);

      for await (const msg of client.fetch(messages as number[], {
        source: true,
        uid: true,
      })) {
        try {
          const source = msg.source;
          if (!source) continue;
          const parsed: ParsedMail = await simpleParser(source);

          // Determine which swiftdroom alias this was sent to
          const toAddresses = parsed.to
            ? Array.isArray(parsed.to)
              ? parsed.to.flatMap((a) => a.value)
              : parsed.to.value
            : [];

          const toAlias = toAddresses
            .map((a) => a.address?.toLowerCase() ?? "")
            .find((a) => a.endsWith(SWIFTDROOM_DOMAIN));

          if (!toAlias) {
            // Mark read and skip — not for us
            await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
            continue;
          }

          // Look up the user
          const targetUser = await db.user.findUnique({
            where: { swiftdroomEmail: toAlias },
            select: { id: true, email: true, name: true },
          });

          if (!targetUser) {
            console.warn(`[email-imap] no user for alias ${toAlias}`);
            await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
            continue;
          }

          const fromAddress = parsed.from?.value?.[0];
          const fromEmail = fromAddress?.address ?? "";
          const fromName = fromAddress?.name ?? "";
          const subject = typeof parsed.subject === "string" ? parsed.subject : "";
          const bodyText = typeof parsed.text === "string" ? parsed.text : "";
          const bodyHtml = typeof parsed.html === "string" ? parsed.html : "";
          const imapUid = `${host}:${msg.uid}`;

          // Skip if already stored (idempotent)
          const existing = await db.inboxEmail.findFirst({
            where: { imapUid },
            select: { id: true },
          });
          if (existing) {
            await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
            continue;
          }

          // Store in InboxEmail
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

          console.info(
            `[email-imap] stored email for ${toAlias}: "${subject}" from ${fromEmail}`
          );

          // Auto-complete application if this is a verification code email
          if (isVerificationEmail(subject)) {
            const code = extractVerificationCode(subject, bodyText);
            if (code) {
              console.info(`[email-imap] found code "${code}" for ${toAlias}`);
              await autoCompleteApplication(targetUser.id, code);
            }
          }

          // Notify user (skip verification code emails — they'll see "Applied" in dashboard)
          if (!isVerificationEmail(subject)) {
            await notifyUser(
              targetUser.email,
              targetUser.name,
              fromEmail,
              fromName,
              subject,
              toAlias
            );
          }

          // Mark as read in IMAP so we don't re-process
          await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
        } catch (msgErr) {
          console.error("[email-imap] error processing message:", msgErr);
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    console.error("[email-imap] poll error:", err);
  } finally {
    polling = false;
    try {
      await client.logout();
    } catch {
      // ignore logout errors
    }
  }
}
