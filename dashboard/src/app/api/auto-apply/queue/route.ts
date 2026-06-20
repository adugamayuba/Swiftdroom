import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending,applied,failed,skipped";
  const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);

  const jobs = await db.autoApplyJob.findMany({
    where: { userId: gate.user.id, status: { in: statuses } },
    include: { jobListing: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      status: j.status,
      atsType: j.atsType,
      error: j.error,
      appliedAt: j.appliedAt,
      createdAt: j.createdAt,
      company: j.jobListing.company,
      title: j.jobListing.title,
      location: j.jobListing.location,
      applyUrl: j.jobListing.applyUrl,
    })),
  });
}
