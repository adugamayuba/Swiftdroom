"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getSessionToken } from "@/lib/api-client";
import { resolveAuthenticatedRedirect } from "@/lib/auth-client";

export function AuthNavLink() {
  const [href, setHref] = useState("/login");
  const [label, setLabel] = useState("Log in");

  useEffect(() => {
    if (!getSessionToken()) return;

    resolveAuthenticatedRedirect().then((redirectTo) => {
      if (redirectTo) {
        setHref(redirectTo);
        setLabel("Dashboard");
      }
    });
  }, []);

  return (
    <Link
      href={href}
      className="text-sm font-medium text-white transition hover:text-white/80"
    >
      {label}
    </Link>
  );
}
