import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { apiError, apiZodError } from "@/lib/user-messages";

const updateSchema = z.object({
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(
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

    const existing = await db.application.findFirst({ where: { id, userId } });
    if (!existing) {
      return apiError("Not found", 404);
    }

    const application = await db.application.update({ where: { id }, data });
    return NextResponse.json({ application });
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

  const existing = await db.application.findFirst({ where: { id, userId } });
  if (!existing) {
    return apiError("Not found", 404);
  }

  await db.application.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
