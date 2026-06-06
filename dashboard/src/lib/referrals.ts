import { db } from "./db";
import { PLANS, type PlanId } from "./plans";
import type { User } from "@prisma/client";

const REFERRAL_HOLD_DAYS = 30;
const REFERRER_COMMISSION_PERCENT = 10;
const REFEREE_DISCOUNT_PERCENT = 20;

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createUniqueReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateReferralCode();
    const existing = await db.user.findUnique({ where: { referralCode: code } });
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique referral code");
}

export function getReferralLink(code: string): string {
  const base =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://swiftdroom.com";
  return `${base.replace(/\/$/, "")}/register?ref=${code}`;
}

export function refereeGetsDiscount(user: User): boolean {
  return Boolean(user.referredById) && !user.referralDiscountUsed;
}

export function getRefereeDiscountCouponId(): string | null {
  return process.env.STRIPE_COUPON_REFEREE_20 || null;
}

export async function recordReferralCommission(
  referredUserId: string,
  planId: PlanId,
  stripeInvoiceId?: string
) {
  const referredUser = await db.user.findUnique({
    where: { id: referredUserId },
    select: { id: true, referredById: true, email: true },
  });
  if (!referredUser?.referredById) return null;

  const existing = await db.referralEarning.findUnique({
    where: { referredUserId },
  });
  if (existing) return existing;

  const plan = PLANS[planId];
  const commissionAmount =
    Math.round(plan.price * (REFERRER_COMMISSION_PERCENT / 100) * 100) / 100;
  const eligibleAt = new Date();
  eligibleAt.setDate(eligibleAt.getDate() + REFERRAL_HOLD_DAYS);

  return db.referralEarning.create({
    data: {
      referrerId: referredUser.referredById,
      referredUserId,
      plan: planId,
      subscriptionAmount: plan.price,
      commissionPercent: REFERRER_COMMISSION_PERCENT,
      commissionAmount,
      eligibleAt,
      stripeInvoiceId: stripeInvoiceId || null,
    },
  });
}

export async function markRefereeDiscountUsed(userId: string) {
  await db.user.update({
    where: { id: userId },
    data: { referralDiscountUsed: true },
  });
}

export async function cancelReferralEarningIfPending(referredUserId: string) {
  await db.referralEarning.updateMany({
    where: {
      referredUserId,
      status: { in: ["PENDING", "ELIGIBLE"] },
    },
    data: { status: "CANCELED" },
  });
}

export async function processEligibleReferralEarnings() {
  const now = new Date();
  const pending = await db.referralEarning.findMany({
    where: {
      status: "PENDING",
      eligibleAt: { lte: now },
    },
    include: {
      referrer: { select: { email: true, name: true } },
      referredUser: { select: { email: true } },
    },
  });

  const { sendReferralRedemptionEmail } = await import("./email");

  let processed = 0;
  for (const earning of pending) {
    await db.referralEarning.update({
      where: { id: earning.id },
      data: {
        status: "ELIGIBLE",
        redemptionEmailSentAt: now,
      },
    });
    await sendReferralRedemptionEmail({
      to: earning.referrer.email,
      name: earning.referrer.name,
      amount: earning.commissionAmount,
    });
    processed++;
  }

  return processed;
}

export const REFERRAL_CONFIG = {
  holdDays: REFERRAL_HOLD_DAYS,
  referrerCommissionPercent: REFERRER_COMMISSION_PERCENT,
  refereeDiscountPercent: REFEREE_DISCOUNT_PERCENT,
};
