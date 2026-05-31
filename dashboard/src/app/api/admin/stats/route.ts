import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PLANS } from "@/lib/plans";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    activeSubscribers,
    subscribersByPlan,
    totalApplications,
    applicationsThisMonth,
  ] = await Promise.all([
    db.user.count({ where: { role: "USER" } }),
    db.user.count({
      where: { role: "USER", createdAt: { gte: startOfMonth } },
    }),
    db.user.count({
      where: {
        role: "USER",
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),
    db.user.count({
      where: { subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } },
    }),
    db.user.groupBy({
      by: ["plan"],
      where: { subscriptionStatus: { in: ["ACTIVE", "TRIALING"] } },
      _count: true,
    }),
    db.application.count(),
    db.application.count({
      where: { createdAt: { gte: startOfMonth } },
    }),
  ]);

  const planCounts = subscribersByPlan.reduce(
    (acc, row) => {
      acc[row.plan] = row._count;
      return acc;
    },
    {} as Record<string, number>
  );

  const mrr =
    (planCounts.STARTER || 0) * PLANS.STARTER.price +
    (planCounts.PRO || 0) * PLANS.PRO.price +
    (planCounts.BUSINESS || 0) * PLANS.BUSINESS.price;

  const growthRate =
    newUsersLastMonth > 0
      ? ((newUsersThisMonth - newUsersLastMonth) / newUsersLastMonth) * 100
      : newUsersThisMonth > 0
        ? 100
        : 0;

  const conversionRate =
    totalUsers > 0 ? (activeSubscribers / totalUsers) * 100 : 0;

  const monthlySignups = await db.$queryRaw<
    { month: string; count: bigint }[]
  >`
    SELECT to_char(date_trunc('month', "createdAt"), 'YYYY-MM') as month,
           COUNT(*)::bigint as count
    FROM "User"
    WHERE role = 'USER'
    GROUP BY 1
    ORDER BY 1 DESC
    LIMIT 12
  `;

  return NextResponse.json({
    totalUsers,
    newUsersThisMonth,
    newUsersLastMonth,
    userGrowthRate: Math.round(growthRate * 10) / 10,
    activeSubscribers,
    conversionRate: Math.round(conversionRate * 10) / 10,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    planBreakdown: {
      starter: planCounts.STARTER || 0,
      pro: planCounts.PRO || 0,
      business: planCounts.BUSINESS || 0,
    },
    totalApplications,
    applicationsThisMonth,
    monthlySignups: monthlySignups.map((r) => ({
      month: r.month,
      count: Number(r.count),
    })),
  });
}
