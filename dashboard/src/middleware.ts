import { NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";
import { PRODUCTION_SITE_ORIGINS } from "@/lib/site";

function getAllowedOrigins(): string[] {
  const origins = new Set<string>(PRODUCTION_SITE_ORIGINS);

  for (const value of [
    process.env.APP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    getAppUrl(),
    "http://localhost:3000",
  ]) {
    if (value?.trim()) {
      origins.add(value.replace(/\/$/, ""));
    }
  }

  if (process.env.ALLOWED_ORIGINS?.trim()) {
    for (const origin of process.env.ALLOWED_ORIGINS.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed.replace(/\/$/, ""));
    }
  }

  return [...origins];
}

function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  if (!origin) return false;
  if (origin.startsWith("chrome-extension://")) return true;
  return allowed.some((o) => origin === o);
}

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const allowedOrigins = getAllowedOrigins();
    const response = NextResponse.next();

    const allowed =
      process.env.NODE_ENV !== "production" ||
      isAllowedOrigin(origin, allowedOrigins);

    if (allowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Credentials", "true");
    } else if (process.env.NODE_ENV !== "production") {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-api-token, x-admin-token"
    );

    if (request.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: response.headers });
    }

    return response;
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
