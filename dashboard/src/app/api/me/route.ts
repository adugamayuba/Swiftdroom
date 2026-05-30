import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUsageSummary, hasActiveSubscription } from "@/lib/subscription";
import { getPostAuthRedirect } from "@/lib/user-flow";

export async function GET() {
  const user = await getCurrentUser();
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
