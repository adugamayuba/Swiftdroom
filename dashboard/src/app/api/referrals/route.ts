import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getReferralLink, REFERRAL_CONFIG } from "@/lib/referrals";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const visible = local.slice(0, 2);
  return `${visible}***@${domain}`;
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [referrals, earnings] = await Promise.all([
    db.user.findMany({
      where: { referredById: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    db.referralEarning.findMany({
      where: { referrerId: user.id },
      include: {
        referredUser: { select: { email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const totals = {
    pending: 0,
    eligible: 0,
    paid: 0,
    canceled: 0,
  };

  for (const e of earnings) {
    const key = e.status.toLowerCase() as keyof typeof totals;
    if (key in totals) totals[key] += e.commissionAmount;
  }

  return NextResponse.json({
    referralCode: user.referralCode,
    referralLink: getReferralLink(user.referralCode),
    config: REFERRAL_CONFIG,
    referrals: referrals.map((r) => ({
      id: r.id,
      name: r.name || "User",
      email: maskEmail(r.email),
      plan: r.plan,
      subscribed: r.subscriptionStatus === "ACTIVE" || r.subscriptionStatus === "TRIALING",
      joinedAt: r.createdAt,
    })),
    earnings: earnings.map((e) => ({
      id: e.id,
      referredEmail: maskEmail(e.referredUser.email),
      referredName: e.referredUser.name,
      plan: e.plan,
      subscriptionAmount: e.subscriptionAmount,
      commissionAmount: e.commissionAmount,
      status: e.status,
      eligibleAt: e.eligibleAt,
      paidAt: e.paidAt,
      createdAt: e.createdAt,
    })),
    totals,
  });
}
