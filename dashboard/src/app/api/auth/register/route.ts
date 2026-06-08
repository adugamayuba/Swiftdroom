import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession, hashPassword, getUserFromApiToken } from "@/lib/auth";
import {
  apiError,
  apiZodError,
  friendlyUserMessage,
  USER_MESSAGES,
} from "@/lib/user-messages";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  referralCode: z.string().optional(),
});

function registrationError(error: unknown) {
  console.error("Registration error:", error);

  if (error instanceof z.ZodError) {
    return apiZodError(error);
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: friendlyUserMessage("Email already registered") },
        { status: 400 }
      );
    }
    if (error.code === "P2021") {
      return NextResponse.json(
        { error: USER_MESSAGES.contactSupport },
        { status: 503 }
      );
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      { error: USER_MESSAGES.contactSupport },
      { status: 503 }
    );
  }

  return NextResponse.json(
    { error: friendlyUserMessage("Registration failed") },
    { status: 500 }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, referralCode } = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return apiError("Email already registered", 400);
    }

    let referredById: string | undefined;
    if (referralCode?.trim()) {
      const referrer = await db.user.findUnique({
        where: { referralCode: referralCode.trim().toUpperCase() },
        select: { id: true, email: true },
      });
      if (!referrer) {
        return apiError("Invalid referral code", 400);
      }
      if (referrer.email.toLowerCase() === email.toLowerCase()) {
        return apiError("You cannot use your own referral code", 400);
      }
      referredById = referrer.id;
    }

    const passwordHash = await hashPassword(password);
    const isAdmin =
      process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const { createUniqueReferralCode } = await import("@/lib/referrals");
    const newReferralCode = await createUniqueReferralCode();

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: isAdmin ? "ADMIN" : "USER",
        referralCode: newReferralCode,
        referredById,
        profile: { create: { email, fullName: name || "" } },
        personas: {
          create: {
            name: "Default",
            focus: "General",
            summary: "",
            isDefault: true,
          },
        },
      },
    });

    let sessionToken: string | undefined;
    try {
      sessionToken = await createSession(user.id);
    } catch (sessionError) {
      console.error("Session creation failed after register:", sessionError);
    }

    const { getPostAuthRedirect } = await import("@/lib/user-flow");

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiToken: user.apiToken,
      sessionToken,
      redirectTo: getPostAuthRedirect(user),
    });
  } catch (error) {
    return registrationError(error);
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return apiError("Unauthorized", 401);
  }

  const user = await getUserFromApiToken(token);
  if (!user) {
    return apiError("Invalid token", 401);
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      apiToken: user.apiToken,
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
