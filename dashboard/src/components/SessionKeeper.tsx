"use client";

import { useEffect } from "react";
import {
  apiFetch,
  clearSessionToken,
  getSessionToken,
  setSessionToken,
} from "@/lib/api-client";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-session";
import { clearApiToken, persistApiToken } from "@/lib/extension-client";

function refreshSession() {
  if (!getSessionToken()) return;

  apiFetch("/api/me")
    .then(async (res) => {
      if (!res.ok) {
        if (res.status === 401) {
          clearSessionToken();
          clearApiToken();
        }
        return;
      }
      const data = await res.json();
      if (data.sessionToken) setSessionToken(data.sessionToken);
      if (data.apiToken) persistApiToken(data.apiToken);
    })
    .catch(() => {});
}

/** Keeps long-lived sessions fresh across page loads (Vercel UI + Railway API). */
export default function SessionKeeper() {
  useEffect(() => {
    refreshSession();

    const onAuthChanged = (e: Event) => {
      const signedIn = (e as CustomEvent<{ signedIn?: boolean }>).detail?.signedIn;
      if (signedIn === false) return;
      refreshSession();
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  return null;
}
