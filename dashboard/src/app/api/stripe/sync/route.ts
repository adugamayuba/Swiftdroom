import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscription";
import { syncSubscriptionFromStripe } from "@/lib/stripe-subscription";
import { db } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe";

/** Recover subscription from Stripe when webhooks were missed. */
export async function POST(request: NextRequest) {
  let user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({ activated: hasActiveSubscription(user) });
  }

  if (hasActiveSubscription(user)) {
    return NextResponse.json({ activated: true });
  }

  const activated = await syncSubscriptionFromStripe(user);
  const refreshed = await db.user.findUnique({ where: { id: user.id } });
  const current = refreshed ? { ...user, ...refreshed } : user;

  return NextResponse.json({
    activated: activated || hasActiveSubscription(current),
  });
}
