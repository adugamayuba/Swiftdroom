"use client";

import { useEffect } from "react";
import { apiFetch, getSessionToken, setSessionToken } from "@/lib/api-client";

/** Keeps long-lived sessions fresh across page loads (Vercel UI + Railway API). */
export default function SessionKeeper() {
  useEffect(() => {
    if (!getSessionToken()) return;

    apiFetch("/api/me")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (data.sessionToken) {
          setSessionToken(data.sessionToken);
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
