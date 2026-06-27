import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "swiftdroom-dev-secret"
);

const ADMIN_COOKIE = "admin_session";

export function isAdminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return password === expected;
}

export async function createAdminSession() {
  const token = await new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("12h")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 12,
    path: "/",
  });

  return token;
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function verifyAdminSessionFromToken(
  token: string
): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.admin === true;
  } catch {
    return false;
  }
}

export async function getAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminSessionFromToken(token);
}

export async function requireAdminSession(
  request: NextRequest
): Promise<boolean> {
  // Try every credential source — a stale x-admin-token in localStorage must not
  // block a valid admin_session cookie (common after re-login or cross-tab drift).
  const candidates = new Set<string>();
  const headerToken = request.headers.get("x-admin-token")?.trim();
  const auth = request.headers.get("authorization");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : null;
  const cookieToken = request.cookies.get(ADMIN_COOKIE)?.value;

  for (const t of [headerToken, bearer, cookieToken]) {
    if (t) candidates.add(t);
  }

  for (const token of candidates) {
    if (await verifyAdminSessionFromToken(token)) return true;
  }
  return false;
}

/** Return the first admin token on the request (for syncing client localStorage). */
export function getAdminTokenFromRequest(request: NextRequest): string | null {
  return (
    request.headers.get("x-admin-token")?.trim() ||
    (request.headers.get("authorization")?.startsWith("Bearer ")
      ? request.headers.get("authorization")!.slice(7).trim()
      : null) ||
    request.cookies.get(ADMIN_COOKIE)?.value ||
    null
  );
}
