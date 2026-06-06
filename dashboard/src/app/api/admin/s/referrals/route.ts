import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { processEligibleReferralEarnings } from "@/lib/referrals";

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = request.nextUrl.searchParams.get("status");

  const earnings = await db.referralEarning.findMany({
    where: status ? { status: status as "PENDING" | "ELIGIBLE" | "PAID" | "CANCELED" } : undefined,
    include: {
      referrer: { select: { id: true, email: true, name: true, referralCode: true } },
      referredUser: { select: { id: true, email: true, name: true, plan: true } },
    },
    orderBy: [{ status: "asc" }, { eligibleAt: "asc" }],
  });

  const summary = {
    pending: { count: 0, amount: 0 },
    eligible: { count: 0, amount: 0 },
    paid: { count: 0, amount: 0 },
    canceled: { count: 0, amount: 0 },
  };

  for (const e of earnings) {
    const key = e.status.toLowerCase() as keyof typeof summary;
    if (key in summary) {
      summary[key].count++;
      summary[key].amount += e.commissionAmount;
    }
  }

  return NextResponse.json({ earnings, summary });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action === "process_eligible") {
    const processed = await processEligibleReferralEarnings();
    return NextResponse.json({ processed });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
