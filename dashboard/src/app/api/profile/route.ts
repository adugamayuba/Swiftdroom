import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser, getUserFromApiToken } from "@/lib/auth";
import { parseName } from "@/lib/utils";

async function resolveUser(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (token) return getUserFromApiToken(token);
  return getCurrentUser();
}

function isProfileComplete(profile: {
  fullName: string;
  email: string;
  resumeText: string;
} | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.fullName.trim() &&
      profile.email.trim() &&
      profile.resumeText.trim().length > 50
  );
}

const profileSchema = z.object({
  fullName: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  resumeText: z.string().optional(),
  resumeFileName: z.string().optional(),
  resumeUrl: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ profile: user.profile });
}

export async function PUT(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const data = profileSchema.parse(body);

    if (data.fullName && !data.firstName) {
      const { firstName, lastName } = parseName(data.fullName);
      data.firstName = firstName;
      data.lastName = lastName;
    }

    const profile = await db.profile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...data },
      update: data,
    });

    const complete = isProfileComplete(profile);
    if (complete !== user.onboardingComplete) {
      await db.user.update({
        where: { id: user.id },
        data: { onboardingComplete: complete },
      });
    }

    return NextResponse.json({ profile, onboardingComplete: complete });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
