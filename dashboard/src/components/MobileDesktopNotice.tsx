"use client";

import { Monitor, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSignOut } from "@/lib/auth-session";

const DISMISS_KEY = "swiftdroom_mobile_banner_dismissed";

function useIsNarrow(breakpointPx: number) {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const update = () => setNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpointPx]);

  return narrow;
}

/** Subtle dismissible banner for marketing pages. */
export function MobileDesktopBanner() {
  const narrow = useIsNarrow(1024);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!narrow || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[var(--brand-header)]/10 bg-[var(--brand-lavender)] px-4 py-3 shadow-lg md:hidden">
      <div className="mx-auto flex max-w-lg items-start gap-3">
        <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-header)]" />
        <p className="flex-1 text-sm text-[var(--brand-header)]">
          Swiftdroom works best on <strong>desktop Chrome</strong>. Open on your computer
          for autofill and the extension.
        </p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem(DISMISS_KEY, "1");
            setDismissed(true);
          }}
          className="shrink-0 rounded p-1 text-[var(--brand-header)]/60 hover:bg-black/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Full gate for dashboard — mobile can browse but core tools need desktop. */
export function MobileDesktopGate({
  children,
  showSignOut = false,
}: {
  children: React.ReactNode;
  showSignOut?: boolean;
}) {
  const narrow = useIsNarrow(1024);
  const handleSignOut = useSignOut();

  if (!narrow) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--brand-mint)]">
        <Monitor className="h-7 w-7 text-[var(--brand-header)]" />
      </div>
      <h2 className="mt-6 text-xl font-semibold text-[var(--brand-header)]">
        Open on desktop for the full experience
      </h2>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--brand-header)]/65">
        The Swiftdroom dashboard and Chrome extension are built for desktop. Sign in on
        your computer to manage your profile, autofill applications, and track your
        pipeline.
      </p>
      <p className="mt-6 text-xs text-[var(--brand-header)]/45">
        swiftdroom.com — use Chrome on Mac or Windows
      </p>
      {showSignOut && (
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="mt-8 text-sm font-medium text-[var(--brand-header)]/70 underline hover:text-[var(--brand-header)]"
        >
          Sign out
        </button>
      )}
    </div>
  );
}
