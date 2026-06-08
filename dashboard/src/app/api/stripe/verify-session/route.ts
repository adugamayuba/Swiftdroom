import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import {
  activateFromCheckoutSession,
  syncSubscriptionFromStripe,
} from "@/lib/stripe-subscription";
import { db } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/subscription";
import { apiError, apiZodError, friendlyUserMessage } from "@/lib/user-messages";

const schema = z.object({
  sessionId: z.string().min(1),
});

/** Fallback when webhooks are delayed or misconfigured — confirms payment via Stripe API. */
export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: friendlyUserMessage("Unauthorized") },
      { status: 401 }
    );
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ activated: hasActiveSubscription(user) });
  }

  try {
    const body = await request.json();
    const { sessionId } = schema.parse(body);

    if (hasActiveSubscription(user)) {
      return NextResponse.json({ activated: true });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.userId !== user.id) {
      return apiError("This payment does not match your account.", 403);
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json({ activated: false, pending: true });
    }

    let activated = await activateFromCheckoutSession(session);
    if (!activated) {
      activated = await syncSubscriptionFromStripe(user);
    }

    const refreshed = await db.user.findUnique({ where: { id: user.id } });
    const current = refreshed ? { ...user, ...refreshed } : user;
    return NextResponse.json({
      activated: activated || hasActiveSubscription(current),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }
    console.error("Verify session error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Checkout failed") },
      { status: 500 }
    );
  }
}
