import { NextRequest, NextResponse } from "next/server";
import { isAdminPasswordConfigured, requireAdminSession } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ authenticated: false, configured: false });
  }

  const authenticated = await requireAdminSession(request);
  return NextResponse.json({ authenticated, configured: true });
}
