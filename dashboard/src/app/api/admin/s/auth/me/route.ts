import { NextRequest, NextResponse } from "next/server";
import {
  getAdminTokenFromRequest,
  isAdminPasswordConfigured,
  requireAdminSession,
} from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  if (!isAdminPasswordConfigured()) {
    return NextResponse.json({ authenticated: false, configured: false });
  }

  const authenticated = await requireAdminSession(request);
  const adminToken = authenticated ? getAdminTokenFromRequest(request) : undefined;
  return NextResponse.json({ authenticated, configured: true, adminToken });
}
