import { NextRequest, NextResponse } from "next/server";
import type { User } from "@prisma/client";
import { resolveUser } from "@/lib/auth";
import {
  hasActiveSubscription,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage } from "@/lib/user-messages";

export type GatedUserResult =
  | { user: User; response: null }
  | { user: null; response: NextResponse };

/** Require an active paid subscription (Starter+). */
export async function requireActiveSubscription(
  request: NextRequest
): Promise<GatedUserResult> {
  const user = await resolveUser(request);
  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: friendlyUserMessage("Unauthorized") },
        { status: 401 }
      ),
    };
  }

  const synced = await syncExpiredSubscription(user);
  if (!hasActiveSubscription(synced)) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: friendlyUserMessage("Active subscription required"),
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 403 }
      ),
    };
  }

  return { user: synced, response: null };
}
