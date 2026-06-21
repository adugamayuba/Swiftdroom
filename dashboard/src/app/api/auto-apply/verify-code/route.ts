/**
 * POST /api/auto-apply/verify-code
 *
 * Completes a Greenhouse application that was held pending email verification.
 * Greenhouse sends a security code to the applicant's email when reCAPTCHA
 * fails — the user enters the code here to finish submitting.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { completeWithSecurityCode } from "@/lib/apply-greenhouse";
import type { ApplyPayload } from "@/lib/apply-lever";

export async function POST(req: NextRequest) {
  const gate = await requireActiveSubscription(req);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const { jobId, securityCode } = (await req.json()) as {
    jobId?: string;
    securityCode?: string;
  };

  if (!jobId || !securityCode?.trim()) {
    return NextResponse.json(
      { error: "jobId and securityCode are required" },
      { status: 400 }
    );
  }

  // Load the queued job
  const job = await db.autoApplyJob.findFirst({
    where: { id: jobId, userId, status: "failed", error: "security_code_required" },
    include: { jobListing: true },
  });

  if (!job) {
    return NextResponse.json(
      { error: "Job not found or already completed" },
      { status: 404 }
    );
  }

  // Rebuild the application payload from the user's profile
  const [profile, settings] = await Promise.all([
    db.profile.findUnique({ where: { userId } }),
    db.autoApplySettings.findUnique({ where: { userId } }),
  ]);

  if (!profile?.email) {
    return NextResponse.json(
      { error: "Profile incomplete — add your email" },
      { status: 400 }
    );
  }

  const payload: ApplyPayload & { resumeText: string; jobTitle: string; externalId?: string } = {
    fullName:
      profile.fullName ||
      `${profile.firstName} ${profile.lastName}`.trim() ||
      profile.email.split("@")[0],
    firstName: profile.firstName || profile.fullName?.split(" ")[0] || "",
    lastName:
      profile.lastName ||
      profile.fullName?.split(" ").slice(1).join(" ") ||
      "",
    email: profile.email,
    phone: profile.phone || undefined,
    linkedinUrl: profile.linkedinUrl || undefined,
    resumeUrl: profile.resumeUrl || undefined,
    resumeText: profile.resumeText || "",
    jobTitle: job.jobListing.title,
    externalId: job.jobListing.externalId,
    coverLetter: settings?.coverLetter || undefined,
  };

  const result = await completeWithSecurityCode(
    job.jobListing.applyUrl,
    payload,
    securityCode.trim()
  );

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
        notes: "Auto-applied via Swiftdroom (email verified)",
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

    return NextResponse.json({ success: true, company: job.jobListing.company, role: job.jobListing.title });
  }

  // Still failed after security code — update error message
  await db.autoApplyJob.update({
    where: { id: job.id },
    data: { error: result.error || "Security code verification failed" },
  });

  return NextResponse.json(
    { success: false, error: result.error || "Verification failed" },
    { status: 400 }
  );
}
