import { friendlyUserMessage, USER_MESSAGES } from "@/lib/user-messages";

const SESSION_KEY = "swiftdroom_session_token";
const ADMIN_SESSION_KEY = "swiftdroom_admin_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function sessionCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (host === "swiftdroom.com" || host === "www.swiftdroom.com") {
    return ".swiftdroom.com";
  }
  return undefined;
}

function readSessionCookie(): string | null {
  if (typeof document === "undefined") return null;
  const pattern = new RegExp(`(?:^|; )${SESSION_KEY}=([^;]*)`);
  const match = document.cookie.match(pattern);
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function writeSessionCookie(token: string) {
  if (typeof document === "undefined") return;
  const domain = sessionCookieDomain();
  const domainPart = domain ? `; domain=${domain}` : "";
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(token)}; max-age=${SESSION_MAX_AGE_SECONDS}; path=/; samesite=lax${secure}${domainPart}`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  const domain = sessionCookieDomain();
  const domainPart = domain ? `; domain=${domain}` : "";
  document.cookie = `${SESSION_KEY}=; max-age=0; path=/; samesite=lax${domainPart}`;
}

/** Railway API base URL. Empty = same origin (local dev or monolith deploy). */
export function getApiBaseUrl(): string {
  const url =
    process.env.API_URL?.trim() || process.env.NEXT_PUBLIC_API_URL?.trim();
  return url ? url.replace(/\/$/, "") : "";
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${normalized}` : normalized;
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromStorage = localStorage.getItem(SESSION_KEY);
  if (fromStorage) return fromStorage;

  const fromCookie = readSessionCookie();
  if (fromCookie) {
    localStorage.setItem(SESSION_KEY, fromCookie);
    return fromCookie;
  }

  return null;
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token);
  writeSessionCookie(token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY);
  clearSessionCookie();
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ADMIN_SESSION_KEY);
}

export function setAdminToken(token: string) {
  localStorage.setItem(ADMIN_SESSION_KEY, token);
}

export function clearAdminToken() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}

/** Parse a failed API response into a customer-friendly message. */
export async function readApiError(
  response: Response,
  fallback = USER_MESSAGES.tryAgain
): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string };
    return friendlyUserMessage(data.error, fallback);
  } catch {
    return response.status >= 500
      ? USER_MESSAGES.contactSupport
      : USER_MESSAGES.network;
  }
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  const isAdminRoute = path.startsWith("/api/admin/s");
  const token = isAdminRoute ? getAdminToken() : getSessionToken();

  if (token) {
    if (isAdminRoute) {
      headers.set("x-admin-token", token);
    }
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
    credentials: "include",
  });
}
