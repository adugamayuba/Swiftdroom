import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { createUniqueCommunitySlug } from "@/lib/community";
import { createUniqueReferralCode } from "@/lib/referrals";
import { getPostAuthRedirect } from "@/lib/user-flow";
import { apiError, apiZodError } from "@/lib/user-messages";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  token: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, token } = registerSchema.parse(body);
    const normalizedEmail = email.toLowerCase().trim();

    const invite = await db.communityInvite.findUnique({ where: { token } });
    if (!invite) {
      return apiError("Invalid invite link.", 400);
    }
    if (invite.acceptedAt) {
      return apiError("This invite has already been used.", 400);
    }
    if (invite.expiresAt < new Date()) {
      return apiError("This invite has expired. Ask Swiftdroom for a new one.", 400);
    }
    if (invite.email !== normalizedEmail) {
      return apiError("Use the email address this invite was sent to.", 400);
    }

    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return apiError("Email already registered.", 400);
    }

    const passwordHash = await hashPassword(password);
    const referralCode = await createUniqueReferralCode();
    const communityName = invite.communityName.trim() || name?.trim() || "My Community";
    const slug = await createUniqueCommunitySlug(communityName);

    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name: name?.trim() || communityName,
          role: "COMMUNITY_LEADER",
          referralCode,
          onboardingComplete: true,
          profile: { create: { email: normalizedEmail, fullName: name?.trim() || communityName } },
        },
      });

      await tx.community.create({
        data: {
          leaderId: created.id,
          name: communityName,
          slug,
        },
      });

      await tx.communityInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });

      return created;
    });

    let sessionToken: string | undefined;
    try {
      sessionToken = await createSession(user.id);
    } catch (sessionError) {
      console.error("Session creation failed after community register:", sessionError);
    }

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiToken: user.apiToken,
      sessionToken,
      redirectTo: getPostAuthRedirect(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) return apiZodError(error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return apiError("Email already registered.", 400);
    }
    console.error("Community registration error:", error);
    return apiError("Registration failed.", 500);
  }
}
