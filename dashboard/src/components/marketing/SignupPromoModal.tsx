"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { getSessionToken } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { trackVisitorEvent } from "@/components/VisitorTracker";

const PROMO_CODE = "LAXJSLCA";
const DISMISS_KEY = "swiftdroom_promo_dismissed_until";
const DEADLINE_KEY = "swiftdroom_promo_deadline";
const OFFER_MINUTES = 10;
const SHOW_AFTER_MS = 22_000;

function formatCountdown(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function shouldShowOnPath(path: string): boolean {
  if (path.startsWith("/dashboard") || path.startsWith("/admin")) return false;
  if (path.startsWith("/onboarding") || path.startsWith("/subscribe")) return false;
  if (path === "/register") return false;
  return true;
}

/** Timed signup offer — 20% off if they register within 10 minutes. */
export function SignupPromoModal() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!shouldShowOnPath(pathname) || getSessionToken()) return;

    const dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (Date.now() < dismissedUntil) return;

    let deadline = Number(sessionStorage.getItem(DEADLINE_KEY) || 0);
    if (!deadline || Date.now() > deadline) {
      deadline = Date.now() + OFFER_MINUTES * 60 * 1000;
      sessionStorage.setItem(DEADLINE_KEY, String(deadline));
    }

    let shown = false;
    function show() {
      if (shown || getSessionToken()) return;
      shown = true;
      setVisible(true);
      setRemainingMs(deadline - Date.now());
      trackEvent("promo_shown", { code: PROMO_CODE });
      trackVisitorEvent("promo_shown", PROMO_CODE);
    }

    const timer = window.setTimeout(show, SHOW_AFTER_MS);

    function onExitIntent(e: MouseEvent) {
      if (e.clientY <= 8) show();
    }
    document.addEventListener("mouseout", onExitIntent);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseout", onExitIntent);
    };
  }, [pathname]);

  useEffect(() => {
    if (!visible) return;
    const tick = window.setInterval(() => {
      const deadline = Number(sessionStorage.getItem(DEADLINE_KEY) || 0);
      const left = deadline - Date.now();
      if (left <= 0) {
        setVisible(false);
        localStorage.setItem(
          DISMISS_KEY,
          String(Date.now() + 24 * 60 * 60 * 1000)
        );
        clearInterval(tick);
        return;
      }
      setRemainingMs(left);
    }, 1000);
    return () => clearInterval(tick);
  }, [visible]);

  function dismiss() {
    setVisible(false);
    localStorage.setItem(
      DISMISS_KEY,
      String(Date.now() + 24 * 60 * 60 * 1000)
    );
    trackEvent("promo_dismissed", { code: PROMO_CODE });
    trackVisitorEvent("promo_dismissed", PROMO_CODE);
  }

  function onCtaClick() {
    trackEvent("promo_click", { code: PROMO_CODE });
    trackVisitorEvent("promo_click", PROMO_CODE);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-labelledby="promo-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--brand-lavender)]/30 bg-[var(--brand-dark)] p-6 text-white shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <p className="text-sm font-medium uppercase tracking-wider text-[var(--brand-lavender)]">
          Limited-time offer
        </p>
        <h2 id="promo-title" className="mt-2 text-2xl font-semibold leading-tight">
          Get 20% off your first month
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Create your account now and apply to jobs 10x faster with AI autofill.
        </p>

        <div className="mt-5 flex items-center justify-between rounded-lg bg-white/10 px-4 py-3">
          <div>
            <p className="text-xs text-white/50">Your code</p>
            <p className="font-mono text-lg font-bold tracking-wide">{PROMO_CODE}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/50">Expires in</p>
            <p className="font-mono text-lg font-bold text-[var(--brand-mint-stat)]">
              {formatCountdown(remainingMs)}
            </p>
          </div>
        </div>

        <Link
          href={`/register?ref=${PROMO_CODE}`}
          onClick={onCtaClick}
          className="al-btn-white mt-5 block w-full py-3 text-center text-sm font-semibold"
        >
          Claim 20% off — create account
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/60"
        >
          No thanks, I&apos;ll pay full price
        </button>
      </div>
    </div>
  );
}
