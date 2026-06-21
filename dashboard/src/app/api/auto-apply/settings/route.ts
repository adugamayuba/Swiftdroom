import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { apiError, apiZodError } from "@/lib/user-messages";
import { PLANS } from "@/lib/plans";
import type { SubscriptionPlan } from "@prisma/client";

function getMonthlyLimit(plan: SubscriptionPlan): number {
  if (plan === "STARTER") return PLANS.STARTER.autoApplyLimit;
  if (plan === "PRO") return PLANS.PRO.autoApplyLimit;
  if (plan === "BUSINESS") return PLANS.BUSINESS.autoApplyLimit;
  return 0;
}

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  minMatchScore: z.number().int().min(0).max(100).optional(),
  dailyLimit: z.number().int().min(1).max(50).optional(),
  coverLetter: z.string().max(5000).optional(),
});

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const [settings, user] = await Promise.all([
    db.autoApplySettings.findUnique({ where: { userId: gate.user.id } }),
    db.user.findUnique({
      where: { id: gate.user.id },
      select: { plan: true, currentPeriodStart: true },
    }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const periodStart = user?.currentPeriodStart ?? new Date(new Date().setDate(1));

  const [appliedToday, totalPending, appliedThisMonth] = await Promise.all([
    db.autoApplyJob.count({
      where: { userId: gate.user.id, status: "applied", appliedAt: { gte: todayStart } },
    }),
    db.autoApplyJob.count({
      where: { userId: gate.user.id, status: "pending" },
    }),
    db.autoApplyJob.count({
      where: { userId: gate.user.id, status: "applied", appliedAt: { gte: periodStart } },
    }),
  ]);

  const monthlyLimit = getMonthlyLimit(user?.plan ?? "NONE");

  return NextResponse.json({
    settings: settings ?? {
      enabled: false,
      minMatchScore: 35,
      dailyLimit: 10,
      coverLetter: "",
      totalApplied: 0,
    },
    appliedToday,
    totalPending,
    appliedThisMonth,
    monthlyLimit,
    remainingThisMonth: Math.max(0, monthlyLimit - appliedThisMonth),
  });
}

export async function PUT(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const data = settingsSchema.parse(body);

    const settings = await db.autoApplySettings.upsert({
      where: { userId: gate.user.id },
      create: {
        userId: gate.user.id,
        enabled: data.enabled ?? false,
        minMatchScore: data.minMatchScore ?? 35,
        dailyLimit: data.dailyLimit ?? 10,
        coverLetter: data.coverLetter ?? "",
      },
      update: {
        ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        ...(data.minMatchScore !== undefined ? { minMatchScore: data.minMatchScore } : {}),
        ...(data.dailyLimit !== undefined ? { dailyLimit: data.dailyLimit } : {}),
        ...(data.coverLetter !== undefined ? { coverLetter: data.coverLetter } : {}),
      },
    });

    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof z.ZodError) return apiZodError(error);
    return apiError("Update failed", 500);
  }
}
