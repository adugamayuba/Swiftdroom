import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth";

const personaSchema = z.object({
  name: z.string().min(1),
  focus: z.string().optional(),
  summary: z.string().optional(),
  skills: z.string().optional(),
  resumeText: z.string().optional(),
  resumeFileName: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personas = await db.persona.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ personas });
}

export async function POST(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

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
