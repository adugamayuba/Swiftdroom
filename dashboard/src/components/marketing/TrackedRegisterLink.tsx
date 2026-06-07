"use client";

import Link from "next/link";
import { trackEvent } from "@/lib/analytics";

export function TrackedRegisterLink({
  children,
  className,
  source,
}: {
  children: React.ReactNode;
  className?: string;
  source: string;
}) {
  return (
    <Link
      href="/register"
      className={className}
      onClick={() => trackEvent("cta_register_click", { source })}
    >
      {children}
    </Link>
  );
}
