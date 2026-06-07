"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { resolveAuthenticatedRedirect } from "@/lib/auth-client";
import { AUTH_CHANGED_EVENT, useIsSignedIn, useSignOut } from "@/lib/auth-session";

export function AuthNavLink() {
  const signedIn = useIsSignedIn();
  const handleSignOut = useSignOut();
  const [href, setHref] = useState("/login");
  const [label, setLabel] = useState("Log in");

  useEffect(() => {
    if (!signedIn) {
      setHref("/login");
      setLabel("Log in");
      return;
    }

    resolveAuthenticatedRedirect().then((redirectTo) => {
      if (redirectTo) {
        setHref(redirectTo);
        setLabel("Dashboard");
      }
    });
  }, [signedIn]);

  useEffect(() => {
    const refresh = () => {
      if (!signedIn) {
        setHref("/login");
        setLabel("Log in");
      }
    };
    window.addEventListener(AUTH_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
  }, [signedIn]);

  if (signedIn) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href={href}
          className="text-sm font-medium text-white transition hover:text-white/80"
        >
          {label}
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="text-sm text-white/55 transition hover:text-white/80"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="text-sm font-medium text-white transition hover:text-white/80"
    >
      {label}
    </Link>
  );
}
