"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearSessionToken, getSessionToken } from "@/lib/api-client";
import { clearApiToken } from "@/lib/extension-client";
import { trackEvent } from "@/lib/analytics";

export const AUTH_CHANGED_EVENT = "swiftdroom:auth-changed";

export function broadcastAuthChange(signedIn: boolean) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(AUTH_CHANGED_EVENT, { detail: { signedIn } })
  );
}

/** Clear all client auth state and notify listeners (other tabs, nav links). */
export async function signOut(options?: { redirectTo?: string; track?: boolean }) {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Still clear local state if the API is unreachable.
  }

  clearSessionToken();
  clearApiToken();
  broadcastAuthChange(false);

  if (options?.track !== false) {
    trackEvent("logout");
  }

  return options?.redirectTo ?? "/login";
}

export function useIsSignedIn() {
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sync = () => setSignedIn(Boolean(getSessionToken()));

    sync();

    const onAuthChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ signedIn?: boolean }>).detail;
      setSignedIn(detail?.signedIn ?? Boolean(getSessionToken()));
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "swiftdroom_session_token" || e.key === "swiftdroom_api_token") {
        sync();
      }
    };

    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return signedIn;
}

export function useSignOut() {
  const router = useRouter();

  return useCallback(async () => {
    const redirectTo = await signOut();
    router.push(redirectTo);
    router.refresh();
  }, [router]);
}
