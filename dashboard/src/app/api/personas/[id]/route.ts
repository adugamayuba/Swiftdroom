import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { apiError, apiZodError } from "@/lib/user-messages";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  focus: z.string().optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  resumeText: z.string().optional(),
  resumeFileName: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await db.persona.findFirst({ where: { id, userId } });
    if (!existing) {
      return apiError("Not found", 404);
    }

    if (data.isDefault) {
      await db.persona.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const persona = await db.persona.update({ where: { id }, data });
    return NextResponse.json({ persona });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }
    return apiError("Update failed", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const userId = gate.user.id;
  const { id } = await params;

  const existing = await db.persona.findFirst({ where: { id, userId } });
  if (!existing) {
    return apiError("Not found", 404);
  }

  await db.persona.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
