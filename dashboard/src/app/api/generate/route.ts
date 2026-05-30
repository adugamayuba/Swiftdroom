import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserFromApiToken } from "@/lib/auth";
import { generateAnswer } from "@/lib/ai";
import {
  canUseExtension,
  hasApplicationQuota,
  incrementApplicationUsage,
} from "@/lib/subscription";

const generateSchema = z.object({
  question: z.string().min(1),
  jobDescription: z.string().optional(),
  personaId: z.string().optional(),
  company: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
    const { question, jobDescription, personaId, company } =
      generateSchema.parse(body);

    let persona = user.personas.find((p) => p.isDefault);
    if (personaId) {
      persona = user.personas.find((p) => p.id === personaId) || persona;
    }

    const answer = await generateAnswer({
      question,
      jobDescription: jobDescription || "",
      resumeText: user.profile?.resumeText || "",
      personaSummary: persona?.summary || "",
      personaFocus: persona?.focus || "",
      company,
    });

    await incrementApplicationUsage(user.id);

    return NextResponse.json({ answer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
