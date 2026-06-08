import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/auth";
import { parseName } from "@/lib/utils";
import { apiError, apiZodError } from "@/lib/user-messages";

function isProfileComplete(profile: {
  fullName: string;
  email: string;
  resumeText: string;
} | null): boolean {
  if (!profile) return false;
  return Boolean(
    profile.fullName?.trim() &&
      profile.email?.trim() &&
      profile.resumeText?.trim()
  );
}

function completionErrors(profile: {
  fullName: string;
  email: string;
  resumeText: string;
} | null): string[] {
  if (!profile) return ["profile not found"];
  const missing: string[] = [];
  if (!profile.fullName?.trim()) missing.push("full name");
  if (!profile.email?.trim()) missing.push("email");
  if (!profile.resumeText?.trim()) missing.push("resume text");
  return missing;
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
    return apiError("Unauthorized", 401);
  }

  return NextResponse.json({ profile: user.profile });
}

export async function PUT(request: NextRequest) {
  const user = await resolveUser(request);
  if (!user) {
    return apiError("Unauthorized", 401);
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

    // Re-read from DB so we get the full merged state (including resumeText
    // saved by the upload route, which may not be in this request body)
    const fresh = await db.profile.findUnique({ where: { userId: user.id } });
    const complete = isProfileComplete(fresh);
    const missing = completionErrors(fresh);

    const { syncDefaultPersonaFromProfile } = await import("@/lib/persona-sync");
    await syncDefaultPersonaFromProfile(user.id);

    if (complete !== user.onboardingComplete) {
      await db.user.update({
        where: { id: user.id },
        data: { onboardingComplete: complete },
      });

      if (complete) {
        await syncDefaultPersonaFromProfile(user.id);
        const { notifyWelcomeIfNeeded } = await import("@/lib/notifications");
        const refreshedUser = await db.user.findUnique({ where: { id: user.id } });
        if (refreshedUser) {
          notifyWelcomeIfNeeded(refreshedUser).catch((err) =>
            console.error("Onboarding welcome email failed:", err)
          );
        }
      }
    }

    return NextResponse.json({ profile: fresh, onboardingComplete: complete, missing });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }
    return apiError("Update failed", 500);
  }
}
