import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdminSession,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import { friendlyUserMessage, zodUserMessage } from "@/lib/user-messages";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Admin access isn't available right now." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { password } = loginSchema.parse(body);

    const valid = await verifyAdminPassword(password);
    if (!valid) {
      return NextResponse.json(
        { error: friendlyUserMessage("Invalid password") },
        { status: 401 }
      );
    }

    const adminToken = await createAdminSession();
    return NextResponse.json({ ok: true, adminToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: zodUserMessage(error) }, { status: 400 });
    }
    return NextResponse.json(
      { error: friendlyUserMessage("Login failed") },
      { status: 500 }
    );
  }
}
