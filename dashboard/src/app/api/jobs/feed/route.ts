import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "recommended,active,saved,clicked";
  const statuses = status.split(",").map((s) => s.trim()).filter(Boolean);

  const items = await db.jobFeedItem.findMany({
    where: {
      userId: gate.user.id,
      status: { in: statuses },
    },
    include: { jobListing: true },
    orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
    take: 50,
  });

  const prefs = await db.jobSearchPreference.findUnique({
    where: { userId: gate.user.id },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      score: item.score,
      matchReason: item.matchReason,
      status: item.status,
      personaId: item.personaId,
      company: item.jobListing.company,
      title: item.jobListing.title,
      location: item.jobListing.location,
      region: item.jobListing.region,
      remote: item.jobListing.remote,
      applyUrl: item.jobListing.applyUrl,
      atsType: item.jobListing.atsType,
      postedAt: item.jobListing.postedAt,
      description: item.jobListing.description.slice(0, 500),
    })),
    preferences: prefs,
  });
}
