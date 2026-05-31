import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { getUsageSummary, hasActiveSubscription } from "@/lib/subscription";
import { getPostAuthRedirect } from "@/lib/user-flow";

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
  });
}
