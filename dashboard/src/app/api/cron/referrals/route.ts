import { NextRequest, NextResponse } from "next/server";
import { processEligibleReferralEarnings } from "@/lib/referrals";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;

  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await processEligibleReferralEarnings();
  return NextResponse.json({ processed });
}
