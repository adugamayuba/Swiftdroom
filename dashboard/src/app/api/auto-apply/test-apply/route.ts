/**
 * Test endpoint: fire a single Greenhouse application with dummy (or real user) data
 * to verify the end-to-end flow in production.
 *
 * GET /api/auto-apply/test-apply?secret=ADMIN_SECRET[&url=JOB_URL][&userId=USER_ID][&email=EMAIL][&code=CODE]
 *
 * If userId is supplied, uses that user's real profile + swiftdroom alias so the
 * full loop works: submit → Greenhouse sends code to alias@swiftdroom.com →
 * IMAP poller picks it up → auto-completes without any manual input.
 */
import { NextRequest, NextResponse } from "next/server";
import { applyViaGreenhouse } from "@/lib/apply-greenhouse";
import { db } from "@/lib/db";
import { getOrAssignSwiftdroomEmail } from "@/lib/user-swiftdroom-email";
import type { ApplyPayload } from "@/lib/apply-lever";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobUrl =
    req.nextUrl.searchParams.get("url") ||
    "https://job-boards.eu.greenhouse.io/productpeople/jobs/4801179101";

  const securityCode = req.nextUrl.searchParams.get("code") || undefined;
  const userId = req.nextUrl.searchParams.get("userId");

  let testEmail: string;
  let dummy: ApplyPayload & { resumeText?: string; jobTitle?: string };

  if (userId) {
    // Use real user profile + their swiftdroom alias for a proper end-to-end test
    const [profile, alias] = await Promise.all([
      db.profile.findUnique({ where: { userId } }),
      getOrAssignSwiftdroomEmail(userId),
    ]);

    if (!profile) {
      return NextResponse.json({ error: `No profile found for userId ${userId}` }, { status: 404 });
    }

    testEmail = alias;
    dummy = {
      fullName: profile.fullName || `${profile.firstName} ${profile.lastName}`.trim() || alias.split("@")[0],
      firstName: profile.firstName || profile.fullName?.split(" ")[0] || "",
      lastName: profile.lastName || profile.fullName?.split(" ").slice(1).join(" ") || "",
      email: alias,
      phone: profile.phone || "1234567890",
      linkedinUrl: profile.linkedinUrl || "https://linkedin.com/in/test",
      resumeUrl: profile.resumeUrl || "https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf",
      resumeText: profile.resumeText || "Experienced professional.",
      jobTitle: "Test Application (Swiftdroom QA)",
      coverLetter: "I am applying as part of a system test. Please disregard.",
    };
  } else {
    // Fallback: dummy data with explicit email (defaults to swiftdroom catch-all test addr)
    testEmail = req.nextUrl.searchParams.get("email") || "hi@swiftdroom.com";
    dummy = {
      fullName: "Test Swiftdroom",
      firstName: "Test",
      lastName: "Swiftdroom",
      email: testEmail,
      phone: "1234567890",
      linkedinUrl: "https://linkedin.com/in/test-swiftdroom",
      resumeUrl: "https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf",
      resumeText:
        "Experienced Product Manager with 5+ years driving B2B SaaS products. " +
        "Led cross-functional teams at Series B startups. Strong background in OKRs, " +
        "Continuous Discovery, and A/B testing. MBA from London Business School.",
      jobTitle: "Test Application (Swiftdroom Auto-Apply QA)",
      coverLetter: "I am applying for this role as part of a system test. Please disregard.",
    };
  }

  console.log(`[test-apply] starting test for ${jobUrl} email=${testEmail}${userId ? ` userId=${userId}` : ""}${securityCode ? " WITH code" : ""}`);
  console.log(`[test-apply] CAPSOLVER_API_KEY set: ${!!process.env.CAPSOLVER_API_KEY}`);
  console.log(`[test-apply] CAPTCHA_API_KEY set: ${!!process.env.CAPTCHA_API_KEY}`);
  console.log(`[test-apply] IMAP_HOST: ${process.env.IMAP_HOST ?? "NOT SET"}`);
  console.log(`[test-apply] IMAP_USER: ${process.env.IMAP_USER ?? "NOT SET"}`);
  console.log(`[test-apply] IMAP_PASS set: ${!!process.env.IMAP_PASS}`);

  const result = await applyViaGreenhouse(jobUrl, dummy, securityCode);
  console.log(`[test-apply] result:`, JSON.stringify(result));

  // If Greenhouse sent a security code AND we have a real userId, create/update an
  // AutoApplyJob record so the IMAP poller can find and auto-complete the application.
  if (result.securityCodeRequired && userId) {
    // Parse company + externalId from the URL so we can upsert the JobListing
    // e.g. https://job-boards.eu.greenhouse.io/productpeople/jobs/4801179101
    const urlMatch = jobUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/([^/?#]+)/);
    const ghCompany = urlMatch?.[1] ?? "unknown";
    const ghExternalId = urlMatch?.[2] ?? jobUrl;

    // Upsert the JobListing so AutoApplyJob can reference it
    const jobListing = await db.jobListing.upsert({
      where: { source_externalId: { source: "greenhouse", externalId: ghExternalId } },
      create: {
        source: "greenhouse",
        externalId: ghExternalId,
        company: ghCompany,
        title: dummy.jobTitle ?? "Test Job",
        applyUrl: jobUrl,
        atsType: "greenhouse",
        region: jobUrl.includes(".eu.") ? "eu" : "us",
      },
      update: {},
      select: { id: true },
    });

    await db.autoApplyJob.upsert({
      where: { userId_jobListingId: { userId, jobListingId: jobListing.id } },
      create: {
        userId,
        jobListingId: jobListing.id,
        atsType: "greenhouse",
        status: "failed",
        error: "security_code_required",
      },
      update: {
        status: "failed",
        error: "security_code_required",
        appliedAt: null,
      },
    });
    console.log(`[test-apply] ✓ AutoApplyJob marked security_code_required — IMAP poller will auto-complete within 2 min`);
  }

  return NextResponse.json({
    jobUrl,
    email: testEmail,
    userId: userId ?? null,
    result,
    nextStep: result.securityCodeRequired
      ? `Code sent to ${testEmail}. IMAP poller will auto-complete within 2 minutes. ` +
        `Check /api/auto-apply/test-poll?secret=... to see inbox status.`
      : undefined,
    timestamp: new Date().toISOString(),
  });
}
