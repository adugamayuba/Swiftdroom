import { NextRequest, NextResponse } from "next/server";
import { getUserFromApiToken } from "@/lib/auth";
import { getActiveJobForUser } from "@/lib/job-feed";
import {
  canUseExtension,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { apiError, friendlyUserMessage } from "@/lib/user-messages";

export async function GET(request: NextRequest) {
  const token =
    request.headers.get("x-api-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return apiError("Unauthorized", 401);
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return apiError("Invalid token", 401);
  }

  user = await syncExpiredSubscription(user);
  if (!canUseExtension(user)) {
    return NextResponse.json(
      { error: friendlyUserMessage("Active subscription required") },
      { status: 403 }
    );
  }

  const activeJob = await getActiveJobForUser(user.id);
  return NextResponse.json({ activeJob });
}
