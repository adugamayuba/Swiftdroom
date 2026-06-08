import { NextRequest, NextResponse } from "next/server";
import { getUserFromApiToken } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canUseExtension,
  getUsageSummary,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage } from "@/lib/user-messages";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json(
      { error: friendlyUserMessage("Unauthorized") },
      { status: 401 }
    );
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json(
      { error: friendlyUserMessage("Invalid token") },
      { status: 401 }
    );
  }

  user = await syncExpiredSubscription(user);

  if (!canUseExtension(user)) {
    return NextResponse.json(
      {
        error: friendlyUserMessage("Active subscription required"),
        code: "SUBSCRIPTION_REQUIRED",
        onboardingComplete: user.onboardingComplete,
        subscriptionStatus: user.subscriptionStatus,
      },
      { status: 403 }
    );
  }

  const { syncDefaultPersonaFromProfile } = await import("@/lib/persona-sync");
  await syncDefaultPersonaFromProfile(user.id);

  const refreshed = await getUserFromApiToken(token);
  if (!refreshed) {
    return NextResponse.json(
      { error: friendlyUserMessage("Invalid token") },
      { status: 401 }
    );
  }

  const mappings = await db.fieldMapping.findMany({
    where: { userId: refreshed.id },
  });

  const { getActiveJobForUser } = await import("@/lib/job-feed");
  const activeJob = await getActiveJobForUser(refreshed.id);

  return NextResponse.json({
    profile: refreshed.profile,
    personas: refreshed.personas,
    fieldMappings: mappings,
    usage: getUsageSummary(refreshed),
    activeJob,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
