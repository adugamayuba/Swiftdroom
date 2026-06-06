import type Stripe from "stripe";
import { db } from "./db";
import { getStripe } from "./stripe";
import { getPlanFromPriceId, PLANS, type PlanId } from "./plans";
import { resetUsageForPeriod } from "./subscription";
import {
  cancelReferralEarningIfPending,
  markRefereeDiscountUsed,
  recordReferralCommission,
} from "./referrals";

export async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  planIdOverride?: PlanId
) {
  const priceId = subscription.items.data[0]?.price.id;
  const planId =
    planIdOverride || (priceId ? getPlanFromPriceId(priceId) : null);
  if (!planId) return;

  const plan = PLANS[planId];
  const statusMap: Record<string, "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING"> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    trialing: "TRIALING",
    unpaid: "PAST_DUE",
    incomplete: "CANCELED",
    incomplete_expired: "CANCELED",
    paused: "CANCELED",
  };

  const status = statusMap[subscription.status] || "CANCELED";

  const periodStart = (subscription as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  }).current_period_start;
  const periodEnd = (subscription as Stripe.Subscription & {
    current_period_start: number;
    current_period_end: number;
  }).current_period_end;

  await db.user.update({
    where: { id: userId },
    data: {
      plan: planId,
      subscriptionStatus: status,
      applicationsLimit:
        status === "ACTIVE" || status === "TRIALING" ? plan.applicationsLimit : 0,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId:
        typeof subscription.customer === "string"
          ? subscription.customer
          : subscription.customer?.id,
      currentPeriodStart: new Date(periodStart * 1000),
      currentPeriodEnd: new Date(periodEnd * 1000),
    },
  });

  if (status === "CANCELED" || status === "PAST_DUE") {
    await cancelReferralEarningIfPending(userId);
  }
}

/** Activate subscription from a paid Checkout session (webhook or success-page fallback). */
export async function activateFromCheckoutSession(
  session: Stripe.Checkout.Session
): Promise<boolean> {
  if (session.payment_status !== "paid") return false;

  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId as PlanId | undefined;
  if (!userId || !planId) return false;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  if (!subscriptionId) return false;

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateUserSubscription(userId, subscription, planId);
  await markRefereeDiscountUsed(userId);
  await recordReferralCommission(userId, planId);
  return true;
}

export async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const user = await db.user.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });
  if (!user) return;

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "CANCELED",
      plan: "NONE",
      applicationsLimit: 0,
      stripeSubscriptionId: null,
    },
  });

  await cancelReferralEarningIfPending(user.id);
}

export async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionRef = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return;

  const user = await db.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!user) return;

  if (invoice.billing_reason === "subscription_cycle") {
    await resetUsageForPeriod(user.id);
  }

  if (invoice.billing_reason === "subscription_create") {
    const line = invoice.lines?.data[0] as
      | (Stripe.InvoiceLineItem & { price?: Stripe.Price | string })
      | undefined;
    const priceRef = line?.price;
    const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id;
    const planId = priceId ? getPlanFromPriceId(priceId) : user.plan;
    if (planId && planId !== "NONE") {
      await recordReferralCommission(user.id, planId as PlanId, invoice.id);
      await markRefereeDiscountUsed(user.id);
    }
  }
}

export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionRef = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId =
    typeof subscriptionRef === "string" ? subscriptionRef : subscriptionRef?.id;
  if (!subscriptionId) return;

  const user = await db.user.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  });
  if (!user) return;

  await db.user.update({
    where: { id: user.id },
    data: {
      subscriptionStatus: "PAST_DUE",
      applicationsLimit: 0,
    },
  });
}
