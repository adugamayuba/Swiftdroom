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

const personaSchema = z.object({
  name: z.string().min(1),
  focus: z.string().optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personas = await db.persona.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ personas });
}

export async function POST(request: NextRequest) {
  const userId = await resolveUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = personaSchema.parse(body);

    if (data.isDefault) {
      await db.persona.updateMany({
        where: { userId },
        data: { isDefault: false },
      });
    }

    const persona = await db.persona.create({
      data: { userId, ...data },
    });

    return NextResponse.json({ persona });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
