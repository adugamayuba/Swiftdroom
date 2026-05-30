import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getUserFromApiToken } from "@/lib/auth";

async function resolveUserId(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (token) {
    const user = await getUserFromApiToken(token);
    return user?.id ?? null;
  }
  const user = await getCurrentUser();
  return user?.id ?? null;
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  focus: z.string().optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const data = updateSchema.parse(body);

    const existing = await db.persona.findFirst({ where: { id, userId } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.persona.findFirst({ where: { id, userId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await db.persona.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
