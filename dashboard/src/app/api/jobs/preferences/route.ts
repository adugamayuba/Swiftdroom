import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveSubscription } from "@/lib/subscription-gate";
import { getOrCreatePreferences } from "@/lib/job-feed";
import { zodUserMessage } from "@/lib/user-messages";

const prefsSchema = z.object({
  region: z.enum(["us", "international", "all"]).optional(),
  remoteOnly: z.boolean().optional(),
  personaId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  const prefs = await getOrCreatePreferences(gate.user.id);
  const personas = await db.persona.findMany({
    where: { userId: gate.user.id },
    select: { id: true, name: true, focus: true, isDefault: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ preferences: prefs, personas });
}

export async function PUT(request: NextRequest) {
  const gate = await requireActiveSubscription(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const data = prefsSchema.parse(body);

    if (data.personaId) {
      const persona = await db.persona.findFirst({
        where: { id: data.personaId, userId: gate.user.id },
      });
      if (!persona) {
        return NextResponse.json({ error: "Persona not found" }, { status: 400 });
      }
    }

    const prefs = await db.jobSearchPreference.upsert({
      where: { userId: gate.user.id },
      create: {
        userId: gate.user.id,
        region: data.region ?? "all",
        remoteOnly: data.remoteOnly ?? false,
        personaId: data.personaId ?? null,
      },
      update: {
        ...(data.region !== undefined ? { region: data.region } : {}),
        ...(data.remoteOnly !== undefined ? { remoteOnly: data.remoteOnly } : {}),
        ...(data.personaId !== undefined ? { personaId: data.personaId } : {}),
      },
    });

    return NextResponse.json({ preferences: prefs });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
