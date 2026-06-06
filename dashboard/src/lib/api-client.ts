const SESSION_KEY = "swiftdroom_session_token";
const ADMIN_SESSION_KEY = "swiftdroom_admin_token";

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
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionToken(token: string) {
  localStorage.setItem(SESSION_KEY, token);
}

export function clearSessionToken() {
  localStorage.removeItem(SESSION_KEY);
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

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  const isAdminRoute = path.startsWith("/api/admin/s");
  const token = isAdminRoute ? getAdminToken() : getSessionToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
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
