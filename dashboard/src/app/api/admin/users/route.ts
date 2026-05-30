import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        onboardingComplete: true,
        plan: true,
        subscriptionStatus: true,
        applicationsUsed: true,
        applicationsLimit: true,
        currentPeriodEnd: true,
        _count: { select: { applications: true } },
      },
    }),
    db.user.count({ where: { role: "USER" } }),
  ]);

  return NextResponse.json({
    users,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
