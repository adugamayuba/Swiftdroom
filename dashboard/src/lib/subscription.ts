import { db } from "./db";
import { PLANS, type PlanId } from "./plans";
import type { User } from "@prisma/client";

export function isSubscriptionPeriodValid(user: User): boolean {
  if (!user.currentPeriodEnd) return true;
  return user.currentPeriodEnd > new Date();
}

export function hasActiveSubscription(user: User): boolean {
  if (user.role === "COMMUNITY_LEADER" || user.role === "ADMIN") return true;
  const statusOk =
    user.subscriptionStatus === "ACTIVE" ||
    user.subscriptionStatus === "TRIALING";
  if (!statusOk) return false;
  return isSubscriptionPeriodValid(user);
}

/** Sync expired local period — blocks access until Stripe renews. */
export async function syncExpiredSubscription<T extends User>(user: T): Promise<T> {
  if (
    (user.subscriptionStatus === "ACTIVE" ||
      user.subscriptionStatus === "TRIALING") &&
    user.currentPeriodEnd &&
    user.currentPeriodEnd <= new Date()
  ) {
    await db.user.update({
      where: { id: user.id },
      data: {
        subscriptionStatus: "CANCELED",
        applicationsLimit: 0,
      },
    });
    return {
      ...user,
      subscriptionStatus: "CANCELED",
      applicationsLimit: 0,
    };
  }
  return user;
}

export function canUseExtension(user: User): boolean {
  return user.onboardingComplete && hasActiveSubscription(user);
}

export function hasApplicationQuota(user: User): boolean {
  if (!hasActiveSubscription(user)) return false;
  return user.applicationsUsed < user.applicationsLimit;
}

export async function incrementApplicationUsage(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { applicationsUsed: { increment: 1 } },
  });
}

export async function resetUsageForPeriod(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { applicationsUsed: 0 },
  });
}

export async function applySubscriptionUpdate(
  userId: string,
  planId: PlanId,
  status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "NONE",
  stripeIds: {
    customerId?: string;
    subscriptionId?: string;
  },
  period?: { start: Date; end: Date }
) {
  const plan = PLANS[planId];

  await db.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      subscriptionStatus: status,
      applicationsLimit: status === "ACTIVE" || status === "TRIALING" ? plan.applicationsLimit : 0,
      stripeCustomerId: stripeIds.customerId,
      stripeSubscriptionId: stripeIds.subscriptionId,
      currentPeriodStart: period?.start,
      currentPeriodEnd: period?.end,
      ...(status === "ACTIVE" || status === "TRIALING"
        ? {}
        : { applicationsLimit: 0 }),
    },
  });
}

export function getUsageSummary(user: User) {
  return {
    used: user.applicationsUsed,
    limit: user.applicationsLimit,
    remaining: Math.max(0, user.applicationsLimit - user.applicationsUsed),
    plan: user.plan,
    status: user.subscriptionStatus,
    periodEnd: user.currentPeriodEnd,
  };
}
