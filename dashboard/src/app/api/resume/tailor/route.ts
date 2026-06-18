import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromApiToken } from "@/lib/auth";
import { tailorResume } from "@/lib/ai";
import {
  canUseExtension,
  hasApplicationQuota,
  syncExpiredSubscription,
} from "@/lib/subscription";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const schema = z.object({
  jobDescription: z.string().optional(),
  company: z.string().optional(),
  role: z.string().optional(),
  personaId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: friendlyUserMessage("Unauthorized") }, { status: 401 });
  }

  let user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: friendlyUserMessage("Invalid token") }, { status: 401 });
  }

  user = await syncExpiredSubscription(user);

  if (!canUseExtension(user)) {
    return NextResponse.json(
      { error: friendlyUserMessage("Active subscription required"), code: "SUBSCRIPTION_REQUIRED" },
      { status: 403 }
    );
  }

  if (!hasApplicationQuota(user)) {
    return NextResponse.json(
      { error: friendlyUserMessage("Monthly application limit reached"), code: "QUOTA_EXCEEDED" },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { jobDescription, company, role, personaId } = schema.parse(body);

    let persona = user.personas.find((p) => p.isDefault);
    if (personaId) {
      persona = user.personas.find((p) => p.id === personaId) || persona;
    }

    const resumeText =
      (persona?.resumeText && persona.resumeText.trim()) ||
      user.profile?.resumeText ||
      "";

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: friendlyUserMessage("Upload a resume first") },
        { status: 400 }
      );
    }

    const result = await tailorResume({
      resumeText,
      jobDescription: jobDescription || "",
      company,
      role,
      personaFocus: persona?.focus || "",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    return NextResponse.json({ error: friendlyUserMessage("Tailoring failed") }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
