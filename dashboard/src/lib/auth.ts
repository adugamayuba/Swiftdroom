import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";

const userInclude = {
  profile: true,
  personas: { orderBy: { createdAt: "asc" as const } },
};

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "swiftdroom-dev-secret"
);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export async function createSession(userId: string) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("365d")
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });

  return token;
}

/** Issue a fresh token when the current one is nearing expiry. */
export async function maybeRefreshSession(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const exp = payload.exp;
    const userId = payload.userId as string | undefined;
    if (!exp || !userId) return null;

    const daysLeft = (exp - Math.floor(Date.now() / 1000)) / 86400;
    if (daysLeft > 30) return null;

    return createSession(userId);
  } catch {
    return null;
  }
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordResetToken() {
  return randomBytes(32).toString("hex");
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function verifySessionToken(
  token: string
): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.userId as string;
  } catch {
    return null;
  }
}

export function getSessionTokenFromRequest(
  request: NextRequest
): string | null {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    if (token) return token;
  }
  return request.cookies.get("session")?.value ?? null;
}

/** Resolve user from Bearer session, cookie, or x-api-token (extension). */
export async function resolveUser(request: NextRequest) {
  const apiToken = request.headers.get("x-api-token");
  if (apiToken) {
    const user = await getUserFromApiToken(apiToken);
    if (user) return user;
  }

  const sessionToken = getSessionTokenFromRequest(request);
  if (sessionToken) {
    const userId = await verifySessionToken(sessionToken);
    if (userId) {
      return db.user.findUnique({
        where: { id: userId },
        include: userInclude,
      });
    }
  }

  return null;
}

export async function getCurrentUser() {
  const userId = await getSession();
  if (!userId) return null;

  return db.user.findUnique({
    where: { id: userId },
    include: userInclude,
  });
}

export async function getUserFromApiToken(token: string) {
  return db.user.findUnique({
    where: { apiToken: token },
    include: { profile: true, personas: { orderBy: { createdAt: "asc" } } },
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
