import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createSession, hashPassword, getUserFromApiToken } from "@/lib/auth";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

function registrationError(error: unknown) {
  console.error("Registration error:", error);

  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }
    if (error.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database tables missing. Run migrations or redeploy the service.",
        },
        { status: 503 }
      );
    }
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return NextResponse.json(
      {
        error:
          "Database connection failed. Use Neon pooled URL for DATABASE_URL and direct URL for DIRECT_URL. Redeploy after updating variables.",
      },
      { status: 503 }
    );
  }

  return NextResponse.json({ error: "Registration failed" }, { status: 500 });
}

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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
