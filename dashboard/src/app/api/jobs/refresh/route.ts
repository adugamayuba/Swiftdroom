import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { refreshJobFeed } from "@/lib/job-feed";
import { apiError } from "@/lib/user-messages";

export async function POST(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const user = await db.user.findUnique({
    where: { id: gate.user.id },
    include: { profile: true },
  });

  if (!user) {
    return apiError("User not found", 404);
  }

  const result = await refreshJobFeed(user);
  return NextResponse.json(result);
}
