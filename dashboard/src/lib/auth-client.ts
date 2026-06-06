"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  apiFetch,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "@/lib/api-client";
import { persistApiToken } from "@/lib/extension-client";

interface MeAuthResponse {
  redirectTo?: string;
  apiToken?: string;
  sessionToken?: string;
}

/** Validate stored session and return redirect target, or null if not signed in. */
export async function resolveAuthenticatedRedirect(): Promise<string | null> {
  if (!getSessionToken()) return null;

  const res = await apiFetch("/api/me");
  if (!res.ok) {
    if (res.status === 401) clearSessionToken();
    return null;
  }

  const data = (await res.json()) as MeAuthResponse;
  if (data.sessionToken) setSessionToken(data.sessionToken);
  if (data.apiToken) persistApiToken(data.apiToken);

  return data.redirectTo || "/dashboard";
}

/** Redirect away from login/register when a valid session already exists. */
export function useRedirectIfAuthenticated() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    resolveAuthenticatedRedirect()
      .then((redirectTo) => {
        if (cancelled) return;
        if (redirectTo) router.replace(redirectTo);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return checking;
}
