import type Stripe from "stripe";
import type { User } from "@prisma/client";
import { db } from "./db";
import { getStripe, isStripeConfigured } from "./stripe";
import { getPlanFromPriceId, PLANS, type PlanId } from "./plans";
import { hasActiveSubscription, resetUsageForPeriod } from "./subscription";
import {
  cancelReferralEarningIfPending,
  markRefereeDiscountUsed,
  recordReferralCommission,
} from "./referrals";
import { notifyPaymentFailed, notifySubscriptionActivated } from "./notifications";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

/** Stripe v22+ moved billing periods from Subscription to SubscriptionItem. */
function getSubscriptionPeriod(
  subscription: Stripe.Subscription
): { start: Date; end: Date } | null {
  const item = subscription.items?.data?.[0];
  const legacy = subscription as Stripe.Subscription & {
    current_period_start?: number;
    current_period_end?: number;
  };

  const periodStart = item?.current_period_start ?? legacy.current_period_start;
  const periodEnd = item?.current_period_end ?? legacy.current_period_end;

  if (
    typeof periodStart === "number" &&
    typeof periodEnd === "number" &&
    !Number.isNaN(periodStart) &&
    !Number.isNaN(periodEnd)
  ) {
    return {
      start: new Date(periodStart * 1000),
      end: new Date(periodEnd * 1000),
    };
  }

  const anchor = subscription.billing_cycle_anchor ?? subscription.start_date;
  if (typeof anchor === "number" && !Number.isNaN(anchor)) {
    const start = new Date(anchor * 1000);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return { start, end };
  }

  return null;
}

function planIdFromSubscription(
  subscription: Stripe.Subscription,
  planIdOverride?: PlanId
): PlanId | null {
  if (planIdOverride) return planIdOverride;

  const metadataPlan = subscription.metadata?.planId;
  if (
    metadataPlan === "STARTER" ||
    metadataPlan === "PRO" ||
    metadataPlan === "BUSINESS"
  ) {
    return metadataPlan;
  }

  const priceId = subscription.items.data[0]?.price.id;
  return priceId ? getPlanFromPriceId(priceId) : null;
}

export async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  planIdOverride?: PlanId
) {
  const planId = planIdFromSubscription(subscription, planIdOverride);
  if (!planId) {
    console.warn("Could not resolve plan for subscription", {
      subscriptionId: subscription.id,
      userId,
      priceId: subscription.items.data[0]?.price.id,
    });
    return false;
  }

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
  const period = getSubscriptionPeriod(subscription);
  const previous = await db.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });
  const wasActive =
    previous?.subscriptionStatus === "ACTIVE" ||
    previous?.subscriptionStatus === "TRIALING";

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
      ...(period
        ? {
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
          }
        : {}),
    },
  });

  if (status === "CANCELED" || status === "PAST_DUE") {
    await cancelReferralEarningIfPending(userId);
  }

  if (!wasActive && (status === "ACTIVE" || status === "TRIALING")) {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (user) await notifySubscriptionActivated(user, planId);
  }

  return true;
}

async function findStripeCustomerId(user: User): Promise<string | null> {
  if (user.stripeCustomerId) return user.stripeCustomerId;

  const stripe = getStripe();
  const customers = await stripe.customers.list({
    email: user.email,
    limit: 10,
  });

  const match =
    customers.data.find((customer) => customer.metadata?.userId === user.id) ||
    customers.data[0];

  if (!match) return null;

  if (!user.stripeCustomerId) {
    await db.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: match.id },
    });
  }

  return match.id;
}

async function findActiveStripeSubscription(
  customerId: string,
  subscriptionId?: string | null
): Promise<Stripe.Subscription | null> {
  const stripe = getStripe();

  if (subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
        return subscription;
      }
    } catch {
      // Fall through to customer lookup.
    }
  }

  for (const status of ["active", "trialing"] as const) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status,
      limit: 5,
    });
    if (subscriptions.data[0]) return subscriptions.data[0];
  }

  return null;
}

/** Recover access when payment succeeded but webhook activation was missed. */
export async function syncSubscriptionFromStripe(user: User): Promise<boolean> {
  if (!isStripeConfigured() || hasActiveSubscription(user)) return false;

  const customerId = await findStripeCustomerId(user);
  if (!customerId) return false;

  const subscription = await findActiveStripeSubscription(
    customerId,
    user.stripeSubscriptionId
  );
  if (!subscription) return false;

  const planId = planIdFromSubscription(subscription);
  if (!planId) {
    console.warn("Stripe subscription found but plan could not be resolved", {
      userId: user.id,
      email: user.email,
      subscriptionId: subscription.id,
    });
    return false;
  }

  const updated = await updateUserSubscription(user.id, subscription, planId);
  if (!updated) return false;

  await markRefereeDiscountUsed(user.id);
  await recordReferralCommission(user.id, planId);
  return true;
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
  const updated = await updateUserSubscription(userId, subscription, planId);
  if (!updated) return false;

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

  await notifyPaymentFailed(user);
}
