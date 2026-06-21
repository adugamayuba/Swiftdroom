/**
 * Test endpoint: fire a single Greenhouse application with dummy data
 * to verify the end-to-end flow in production.
 *
 * GET /api/auto-apply/test-apply?url=JOB_URL&secret=ADMIN_SECRET
 */
import { NextRequest, NextResponse } from "next/server";
import { applyViaGreenhouse } from "@/lib/apply-greenhouse";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const jobUrl =
    req.nextUrl.searchParams.get("url") ||
    "https://job-boards.eu.greenhouse.io/productpeople/jobs/4801179101";

  // Default to a @swiftdroom.com address so the full loop can be tested:
  // Greenhouse sends the code there → Titan Mail catch-all receives it →
  // IMAP poller picks it up automatically.
  // Pass ?email=hi@droomify.com to test the old manual-code flow.
  const testEmail = req.nextUrl.searchParams.get("email") || "test@swiftdroom.com";

  const dummy = {
    fullName: "Test Swiftdroom",
    firstName: "Test",
    lastName: "Swiftdroom",
    email: testEmail,
    phone: "1234567890",
    linkedinUrl: "https://linkedin.com/in/test-swiftdroom",
    resumeUrl:
      "https://www.w3.org/WAI/WCAG21/Techniques/pdf/sample.pdf",
    resumeText:
      "Experienced Product Manager with 5+ years driving B2B SaaS products. " +
      "Led cross-functional teams at Series B startups. Strong background in OKRs, " +
      "Continuous Discovery, and A/B testing. MBA from London Business School.",
    jobTitle: "Test Application (Swiftdroom Auto-Apply QA)",
    coverLetter:
      "I am applying for this role as part of a system test. Please disregard.",
  };

  const securityCode = req.nextUrl.searchParams.get("code") || undefined;

  console.log(`[test-apply] starting test for ${jobUrl} email=${testEmail}${securityCode ? " WITH code" : ""}`);
  console.log(`[test-apply] CAPSOLVER_API_KEY set: ${!!process.env.CAPSOLVER_API_KEY}`);
  console.log(`[test-apply] CAPTCHA_API_KEY set: ${!!process.env.CAPTCHA_API_KEY}`);
  console.log(`[test-apply] IMAP_HOST set: ${!!process.env.IMAP_HOST} (${process.env.IMAP_HOST ?? "not set"})`);
  console.log(`[test-apply] IMAP_USER set: ${!!process.env.IMAP_USER} (${process.env.IMAP_USER ?? "not set"})`);
  console.log(`[test-apply] IMAP_PASS set: ${!!process.env.IMAP_PASS}`);
  const result = await applyViaGreenhouse(jobUrl, dummy, securityCode);
  console.log(`[test-apply] result:`, JSON.stringify(result));

  return NextResponse.json({
    jobUrl,
    result,
    timestamp: new Date().toISOString(),
  });
}
