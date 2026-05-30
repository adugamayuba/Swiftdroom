import { NextRequest, NextResponse } from "next/server";

import { getAppUrl } from "@/lib/app-url";

const ALLOWED_ORIGINS = [
  getAppUrl(),
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "chrome-extension://",
].filter(Boolean) as string[];

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin") || "";
    const response = NextResponse.next();

    const allowed =
      process.env.NODE_ENV !== "production" ||
      ALLOWED_ORIGINS.some(
        (o) => origin === o || origin.startsWith("chrome-extension://")
      );

    if (allowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    } else if (process.env.NODE_ENV !== "production") {
      response.headers.set("Access-Control-Allow-Origin", "*");
    }

    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, x-api-token"
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
