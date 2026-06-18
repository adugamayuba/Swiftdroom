import { NextRequest, NextResponse } from "next/server";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [applications, weekApps, statusGroups] = await Promise.all([
    db.application.count({ where: { userId } }),
    db.application.count({ where: { userId, appliedAt: { gte: weekAgo } } }),
    db.application.groupBy({
      by: ["status"],
      where: { userId },
      _count: { status: true },
    }),
  ]);

  const interviews = statusGroups
    .filter((g) => ["interview", "invited", "offer", "hired"].includes(g.status))
    .reduce((sum, g) => sum + g._count.status, 0);

  const avgMinutesSaved = 4.2;
  const minutesSavedThisWeek = Math.round(weekApps * avgMinutesSaved);

  return NextResponse.json({
    totalApplications: applications,
    applicationsThisWeek: weekApps,
    interviews,
    minutesSavedThisWeek,
    byStatus: Object.fromEntries(statusGroups.map((g) => [g.status, g._count.status])),
  });
}
