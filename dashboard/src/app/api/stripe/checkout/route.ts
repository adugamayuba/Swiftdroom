import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getPriceIdForPlan, type PlanId } from "@/lib/plans";
import { getAppUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";
import {
  getRefereeDiscountCouponId,
  refereeGetsDiscount,
} from "@/lib/referrals";

const checkoutSchema = z.object({
  planId: z.enum(["STARTER", "PRO", "BUSINESS"]),
});

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    const allowBypass =
      process.env.NODE_ENV !== "production" ||
      process.env.ALLOW_STRIPE_BYPASS === "true";

    if (!allowBypass) {
      return NextResponse.json(
        {
          error: friendlyUserMessage(
            "Billing is not configured. Contact support."
          ),
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    const planId = parsed.success ? parsed.data.planId : "STARTER";

    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await db.user.update({
      where: { id: user.id },
      data: {
        plan: planId,
        subscriptionStatus: "ACTIVE",
        applicationsLimit:
          planId === "STARTER" ? 50 : planId === "PRO" ? 150 : 500,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
      },
    });

    const { recordReferralCommission, markRefereeDiscountUsed } = await import(
      "@/lib/referrals"
    );
    await recordReferralCommission(user.id, planId);
    if (refereeGetsDiscount(user)) {
      await markRefereeDiscountUsed(user.id);
    }

    return NextResponse.json({ url: null, activated: true });
  }

  try {
    const body = await request.json();
    const { planId } = checkoutSchema.parse(body);
    const stripe = getStripe();
    const appUrl = getAppUrl();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: getPriceIdForPlan(planId as PlanId), quantity: 1 }],
      success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/subscribe?canceled=true`,
      metadata: { userId: user.id, planId },
      subscription_data: {
        metadata: { userId: user.id, planId },
      },
    };

    if (refereeGetsDiscount(user)) {
      const couponId = getRefereeDiscountCouponId();
      if (couponId) {
        sessionParams.discounts = [{ coupon: couponId }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Checkout failed") },
      { status: 500 }
    );
  }
}
