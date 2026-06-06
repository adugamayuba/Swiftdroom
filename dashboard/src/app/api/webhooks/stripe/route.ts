import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  activateFromCheckoutSession,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionDeleted,
  updateUserSubscription,
} from "@/lib/stripe-subscription";
import { getStripeWebhookSecrets } from "@/lib/stripe-webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  const secrets = getStripeWebhookSecrets();

  if (!signature || secrets.length === 0) {
    console.error("Webhook missing signature or STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = Buffer.from(await request.arrayBuffer());

  let event: Stripe.Event | null = null;
  let lastError: unknown;

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret, 300);
      break;
    } catch (err) {
      lastError = err;
    }
  }

  if (!event) {
    console.error("Webhook signature verification failed:", lastError, {
      bodyBytes: rawBody.length,
      secretCount: secrets.length,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const existing = await db.stripeEvent.findUnique({ where: { id: event.id } });
  if (existing) return NextResponse.json({ received: true });

  await db.stripeEvent.create({ data: { id: event.id, type: event.type } });

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const activated = await activateFromCheckoutSession(session);
        if (!activated) {
          console.warn("checkout.session.completed did not activate user", {
            sessionId: session.id,
            paymentStatus: session.payment_status,
            userId: session.metadata?.userId,
            planId: session.metadata?.planId,
            subscription:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id,
          });
        }
        break;
      }
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
      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
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
