/**
 * Admin endpoint: manually trigger the IMAP inbox poll and return a diagnostic report.
 *
 * GET /api/auto-apply/test-poll?secret=ADMIN_SECRET
 *
 * Use this to:
 * 1. Verify IMAP credentials are configured correctly
 * 2. Force an immediate poll (no need to wait 2 minutes)
 * 3. See which emails were found and processed
 */
import { NextRequest, NextResponse } from "next/server";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const pass = process.env.IMAP_PASS;

  const report: {
    config: Record<string, string | boolean>;
    connected: boolean;
    error?: string;
    unseenCount: number;
    messages: Array<{
      uid: number;
      from: string;
      to: string;
      subject: string;
      bodyPreview: string;
      hasCode: string | null;
      matchedUser: string | null;
    }>;
  } = {
    config: {
      IMAP_HOST: host ?? "NOT SET",
      IMAP_USER: user ?? "NOT SET",
      IMAP_PASS: pass ? "SET (hidden)" : "NOT SET",
    },
    connected: false,
    unseenCount: 0,
    messages: [],
  };

  if (!host || !user || !pass) {
    report.error = "IMAP env vars not configured";
    return NextResponse.json(report);
  }

  const client = new ImapFlow({
    host,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  try {
    await client.connect();
    report.connected = true;

    const lock = await client.getMailboxLock("INBOX");
    try {
      const searchResult = await client.search({ seen: false });
      const seqNums = Array.isArray(searchResult) ? searchResult : [];
      report.unseenCount = seqNums.length;

      if (seqNums.length > 0) {
        // Preview up to 10 messages
        const preview = seqNums.slice(0, 10) as number[];
        for await (const msg of client.fetch(preview, { source: true, uid: true })) {
          if (!msg.source) continue;
          const parsed = await simpleParser(msg.source);

          const toAddresses = parsed.to
            ? Array.isArray(parsed.to)
              ? parsed.to.flatMap((a) => a.value)
              : parsed.to.value
            : [];
          const toAlias = toAddresses
            .map((a) => a.address?.toLowerCase() ?? "")
            .find((a) => a.endsWith("@swiftdroom.com")) ?? "(no swiftdroom address)";

          const fromAddress = parsed.from?.value?.[0];
          const fromStr = fromAddress?.name
            ? `${fromAddress.name} <${fromAddress.address}>`
            : (fromAddress?.address ?? "(unknown)");

          const subject = typeof parsed.subject === "string" ? parsed.subject : "";
          const bodyText = typeof parsed.text === "string" ? parsed.text : "";

          // Code extraction
          const codePatterns = [
            /security code[:\s]+([A-Z0-9]{4,10})/i,
            /verification code[:\s]+([A-Z0-9]{4,10})/i,
            /your code[:\s]+([A-Z0-9]{4,10})/i,
            /code is[:\s]+([A-Z0-9]{4,10})/i,
            /\b([0-9]{5,8})\b/,
          ];
          let extractedCode: string | null = null;
          for (const p of codePatterns) {
            const m = `${subject}\n${bodyText}`.match(p);
            if (m?.[1]) { extractedCode = m[1]; break; }
          }

          // Matched user
          let matchedUser: string | null = null;
          if (toAlias.endsWith("@swiftdroom.com")) {
            const u = await db.user.findUnique({
              where: { swiftdroomEmail: toAlias },
              select: { id: true, email: true },
            });
            matchedUser = u ? `${u.email} (${u.id})` : "NO MATCH in DB";
          }

          const rawText = typeof parsed.text === "string" ? parsed.text.trim() : "";
          const rawHtml = typeof parsed.html === "string" ? parsed.html : "";
          // Greenhouse emails are HTML-only; strip tags for the preview
          const strippedHtml = rawHtml
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/gi, " ")
            .replace(/\s+/g, " ").trim();
          const bodyPreview = (rawText || strippedHtml).slice(0, 600);

          report.messages.push({
            uid: msg.uid,
            from: fromStr,
            to: toAlias,
            subject,
            bodyPreview,
            hasCode: extractedCode,
            matchedUser,
          });
        }
      }
    } finally {
      lock.release();
    }
  } catch (err) {
    report.error = String(err);
  } finally {
    try { await client.logout(); } catch { /* ignore */ }
  }

  // Also trigger the real poller so any codes get auto-completed
  if (report.connected && report.unseenCount > 0) {
    const { pollInboxEmails } = await import("@/lib/email-imap");
    pollInboxEmails().catch(() => {});
  }

  return NextResponse.json(report, { status: 200 });
}
