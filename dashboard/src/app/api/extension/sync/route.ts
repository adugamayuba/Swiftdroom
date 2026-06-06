import { NextRequest, NextResponse } from "next/server";
import { getUserFromApiToken } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  canUseExtension,
  getUsageSummary,
  syncExpiredSubscription,
} from "@/lib/subscription";

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  user = await syncExpiredSubscription(user);

  if (!canUseExtension(user)) {
    return NextResponse.json(
      {
        error: "Active subscription required",
        code: "SUBSCRIPTION_REQUIRED",
        onboardingComplete: user.onboardingComplete,
        subscriptionStatus: user.subscriptionStatus,
      },
      { status: 403 }
    );
  }

  const mappings = await db.fieldMapping.findMany({
    where: { userId: user.id },
  });

  return NextResponse.json({
    profile: user.profile,
    personas: user.personas,
    fieldMappings: mappings,
    usage: getUsageSummary(user),
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
