import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth";
import {
  canUseExtension,
  hasApplicationQuota,
  incrementApplicationUsage,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const applicationSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  url: z.string().url(),
  status: z.string().optional(),
  personaId: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: friendlyUserMessage("Unauthorized") },
      { status: 401 }
    );
  }

  const applications = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  let user = await resolveUser(request);
  if (!user) {
    return NextResponse.json(
      { error: friendlyUserMessage("Unauthorized") },
      { status: 401 }
    );
  }

  user = await syncExpiredSubscription(user);

  if (!canUseExtension(user)) {
    return NextResponse.json(
      {
        error: friendlyUserMessage("Active subscription required"),
        code: "SUBSCRIPTION_REQUIRED",
      },
      { status: 403 }
    );
  }

  if (!hasApplicationQuota(user)) {
    return NextResponse.json(
      {
        error: friendlyUserMessage("Monthly application limit reached"),
        code: "QUOTA_EXCEEDED",
      },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const data = applicationSchema.parse(body);

    const application = await db.application.create({
      data: { userId: user.id, ...data },
    });

    await incrementApplicationUsage(user.id);

    const { notifyApplicationSubmitted } = await import("@/lib/notifications");
    notifyApplicationSubmitted(user, {
      company: application.company,
      role: application.role,
    }).catch((err) =>
      console.error("Application notification email failed:", err)
    );

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    return NextResponse.json(
      { error: friendlyUserMessage("Create failed") },
      { status: 500 }
    );
  }
}
