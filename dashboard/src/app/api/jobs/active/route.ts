import { NextRequest, NextResponse } from "next/server";
import { getUserFromApiToken } from "@/lib/auth";
import { getActiveJobForUser } from "@/lib/job-feed";
import {
  canUseExtension,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage } from "@/lib/user-messages";

export async function GET(request: NextRequest) {
  const token =
    request.headers.get("x-api-token") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

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
      { error: friendlyUserMessage("Active subscription required") },
      { status: 403 }
    );
  }

  const activeJob = await getActiveJobForUser(user.id);
  return NextResponse.json({ activeJob });
}
