import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth";
import {
  canUseExtension,
  hasApplicationQuota,
  incrementApplicationUsage,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const submittedAnswerSchema = z.object({
  label: z.string(),
  value: z.string(),
  draftValue: z.string().optional(),
  source: z.string().optional(),
  isOpenEnded: z.boolean().optional(),
});

const applicationSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  url: z.string().url(),
  status: z.string().optional(),
  personaId: z.string().optional(),
  notes: z.string().optional(),
  jobDescription: z.string().optional(),
  submittedAnswers: z.array(submittedAnswerSchema).optional(),
  fieldsFilled: z.number().int().optional(),
  fieldsAttempted: z.number().int().optional(),
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

  try {
    const body = await request.json();
    const data = applicationSchema.parse(body);

    const existing = await db.application.findFirst({
      where: { userId: user.id, url: data.url },
      orderBy: { appliedAt: "desc" },
    });

    if (existing) {
      const application = await db.application.update({
        where: { id: existing.id },
        data: {
          company: data.company,
          role: data.role,
          status: data.status ?? existing.status,
          personaId: data.personaId ?? existing.personaId,
          notes: data.notes ?? existing.notes,
          jobDescription: data.jobDescription ?? existing.jobDescription,
          ...(data.submittedAnswers
            ? {
                submittedAnswers: data.submittedAnswers as Prisma.InputJsonValue,
              }
            : {}),
          fieldsFilled: data.fieldsFilled ?? existing.fieldsFilled,
          fieldsAttempted: data.fieldsAttempted ?? existing.fieldsAttempted,
        },
      });

      return NextResponse.json({ application, updated: true });
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

    const application = await db.application.create({
      data: {
        userId: user.id,
        company: data.company,
        role: data.role,
        url: data.url,
        status: data.status ?? "filled",
        personaId: data.personaId,
        notes: data.notes ?? "",
        jobDescription: data.jobDescription ?? "",
        submittedAnswers: data.submittedAnswers as Prisma.InputJsonValue,
        fieldsFilled: data.fieldsFilled ?? 0,
        fieldsAttempted: data.fieldsAttempted ?? 0,
      },
    });

    await incrementApplicationUsage(user.id);

    const { notifyApplicationSubmitted } = await import("@/lib/notifications");
    notifyApplicationSubmitted(user, {
      company: application.company,
      role: application.role,
    }).catch((err) =>
      console.error("Application notification email failed:", err)
    );

    return NextResponse.json({ application, updated: false });
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
