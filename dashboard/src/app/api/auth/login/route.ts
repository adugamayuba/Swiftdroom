import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { apiError, apiZodError, friendlyUserMessage } from "@/lib/user-messages";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    const user = await db.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return apiError("Invalid email or password", 401);
    }

    const sessionToken = await createSession(user.id);

    const { getPostAuthRedirect } = await import("@/lib/user-flow");
    const { notifyLogin } = await import("@/lib/notifications");
    notifyLogin(user).catch((err) =>
      console.error("Login notification email failed:", err)
    );

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiToken: user.apiToken,
      sessionToken,
      redirectTo: getPostAuthRedirect(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiZodError(error);
    }
    return NextResponse.json(
      { error: friendlyUserMessage("Login failed") },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
