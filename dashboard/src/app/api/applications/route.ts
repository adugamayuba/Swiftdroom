import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth";
import {
  canUseExtension,
  hasApplicationQuota,
  incrementApplicationUsage,
} from "@/lib/subscription";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const applications = await db.application.findMany({
    where: { userId: user.id },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canUseExtension(user)) {
    return NextResponse.json(
      { error: "Active subscription required", code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }

  if (!hasApplicationQuota(user)) {
    return NextResponse.json(
      { error: "Monthly application limit reached", code: "QUOTA_EXCEEDED" },
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

    return NextResponse.json({ application });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
