import { NextRequest, NextResponse } from "next/server";
import { processSubscribeNudges, processFollowUpReminders } from "@/lib/nudges";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [subscribeNudges, followUpReminders] = await Promise.all([
    processSubscribeNudges(),
    processFollowUpReminders(),
  ]);

  return NextResponse.json({ subscribeNudges, followUpReminders });
}
