import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, hashPasswordResetToken } from "@/lib/auth";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = schema.parse(body);
    const tokenHash = hashPasswordResetToken(token);

    const user = await db.user.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired." },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return NextResponse.json({
      message: "Your password has been updated. You can sign in now.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Update failed") },
      { status: 500 }
    );
  }
}
