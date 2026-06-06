import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createPasswordResetToken,
  hashPasswordResetToken,
} from "@/lib/auth";
import { sendPasswordResetEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = schema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (user) {
      const token = createPasswordResetToken();
      const tokenHash = hashPasswordResetToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: tokenHash,
          passwordResetExpiresAt: expiresAt,
        },
      });

      const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;
      await sendPasswordResetEmail(user, resetUrl);
    }

    return NextResponse.json({
      message:
        "If an account exists for that email, we sent password reset instructions.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: friendlyUserMessage("Update failed") },
      { status: 500 }
    );
  }
}
