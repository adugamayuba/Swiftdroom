import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { getAppUrl } from "@/lib/app-url";
import { apiError } from "@/lib/user-messages";

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
  }

  if (!isStripeConfigured() || !user.stripeCustomerId) {
    return apiError("No billing account found", 400);
  }

  const stripe = getStripe();
  const appUrl = getAppUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
