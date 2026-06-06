import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  createAdminSession,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/admin-auth";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json(
      { error: "Admin password not configured" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { password } = loginSchema.parse(body);

    const valid = await verifyAdminPassword(password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const adminToken = await createAdminSession();
    return NextResponse.json({ ok: true, adminToken });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
