import { NextRequest, NextResponse } from "next/server";
import {
  getSessionTokenFromRequest,
  maybeRefreshSession,
  resolveUser,
} from "@/lib/auth";
import {
  getUsageSummary,
  hasActiveSubscription,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { syncSubscriptionFromStripe } from "@/lib/stripe-subscription";
import { refereeGetsDiscount } from "@/lib/referrals";
import { getPostAuthRedirect } from "@/lib/user-flow";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  let user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  user = await syncExpiredSubscription(user);

  if (!hasActiveSubscription(user)) {
    await syncSubscriptionFromStripe(user);
    const refreshed = await db.user.findUnique({ where: { id: user.id } });
    if (refreshed) {
      user = { ...user, ...refreshed };
    }
  }

  const sessionToken = getSessionTokenFromRequest(request);
  const refreshedToken = sessionToken
    ? await maybeRefreshSession(sessionToken)
    : null;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    apiToken: user.apiToken,
    onboardingComplete: user.onboardingComplete,
    subscriptionStatus: user.subscriptionStatus,
    plan: user.plan,
    hasActiveSubscription: hasActiveSubscription(user),
    redirectTo: getPostAuthRedirect(user),
    usage: getUsageSummary(user),
    referralDiscountAvailable: refereeGetsDiscount(user),
    referralCode: user.referralCode,
    emailNotifications: {
      login: user.emailNotifyLogin,
      applications: user.emailNotifyApplications,
      billing: user.emailNotifyBilling,
    },
    ...(refreshedToken ? { sessionToken: refreshedToken } : {}),
  });
}
