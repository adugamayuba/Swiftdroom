import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { refreshJobFeed } from "@/lib/job-feed";

export async function POST(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const user = await db.user.findUnique({
    where: { id: gate.user.id },
    include: { profile: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const result = await refreshJobFeed(user);
  return NextResponse.json(result);
}
