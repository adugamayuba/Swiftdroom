import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { hasActiveSubscription } from "@/lib/subscription";
import { syncSubscriptionFromStripe } from "@/lib/stripe-subscription";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (hasActiveSubscription(user)) {
      return NextResponse.json({
        activated: true,
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
      });
    }

    const activated = await syncSubscriptionFromStripe(user);
    const refreshed = await db.user.findUnique({ where: { id: user.id } });

    return NextResponse.json({
      activated: activated || (refreshed ? hasActiveSubscription(refreshed) : false),
      email,
      plan: refreshed?.plan ?? user.plan,
      subscriptionStatus: refreshed?.subscriptionStatus ?? user.subscriptionStatus,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    console.error("Admin sync subscription error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
