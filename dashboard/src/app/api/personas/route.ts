import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { apiError, apiZodError } from "@/lib/user-messages";

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
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const personas = await db.persona.findMany({
    where: { userId: gate.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ personas });
}

export async function POST(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const userId = gate.user.id;

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
      return apiZodError(error);
    }
    return apiError("Create failed", 500);
  }
}
