import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  hashPassword,
  verifyPassword,
  getUserFromApiToken,
} from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name } = registerSchema.parse(body);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const isAdmin =
      process.env.ADMIN_EMAIL &&
      email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase();

    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: isAdmin ? "ADMIN" : "USER",
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

    await createSession(user.id);

    const { getPostAuthRedirect } = await import("@/lib/user-flow");

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name },
      apiToken: user.apiToken,
      redirectTo: getPostAuthRedirect(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("x-api-token");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await getUserFromApiToken(token);
  if (!user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
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
