import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { getPlanFromPriceId, PLANS, type PlanId } from "@/lib/plans";
import { resetUsageForPeriod } from "@/lib/subscription";
import {
  cancelReferralEarningIfPending,
  markRefereeDiscountUsed,
  recordReferralCommission,
} from "@/lib/referrals";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existing = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true });

  await db.stripeEvent.create({ data: { id: event.id, type: event.type } });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const userId = session.metadata?.userId;
  const planId = session.metadata?.planId as PlanId | undefined;
  if (!userId || !planId) return;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const stripe = getStripe();
  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateUserSubscription(userId, subscription, planId);
  await markRefereeDiscountUsed(userId);
  await recordReferralCommission(userId, planId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) {
    const user = await db.user.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!user) return;
    await updateUserSubscription(user.id, subscription);
    return;
  }
  await updateUserSubscription(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
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

async function handleInvoicePaid(invoice: Stripe.Invoice) {
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
    const priceId =
      typeof priceRef === "string" ? priceRef : priceRef?.id;
    const planId = priceId ? getPlanFromPriceId(priceId) : user.plan;
    if (planId && planId !== "NONE") {
      await recordReferralCommission(user.id, planId as PlanId, invoice.id);
      await markRefereeDiscountUsed(user.id);
    }
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
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

async function updateUserSubscription(
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
