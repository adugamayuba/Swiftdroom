"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

export default function SubscribeSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");
  const [activating, setActivating] = useState(false);
  const [activationError, setActivationError] = useState("");

  const tryActivate = useCallback(async () => {
    if (sessionId) {
      await apiFetch("/api/stripe/verify-session", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
    }

    const res = await apiFetch("/api/me");
    if (res.ok) {
      const data = await res.json();
      if (data.hasActiveSubscription) {
        return true;
      }
    }
    return false;
  }, [sessionId]);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      const active = await tryActivate();
      if (active) {
        setStatus("active");
        router.push("/dashboard");
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, 1500);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [router, tryActivate]);

  async function handleGoToDashboard() {
    setActivating(true);
    const active = await tryActivate();
    setActivating(false);
    if (active) {
      router.push("/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md text-center">
        {status === "waiting" && (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Confirming your payment...
            </h1>
            <p className="mt-4 text-neutral-600">
              We&apos;re activating your subscription. This usually takes a few seconds.
            </p>
            <div className="mx-auto mt-6 h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
          </>
        )}

        {status === "active" && (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Subscription active
            </h1>
            <p className="mt-4 text-neutral-600">Redirecting to your dashboard...</p>
          </>
        )}

        {status === "timeout" && (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Payment received — almost there
            </h1>
            <p className="mt-4 text-neutral-600">
              Your payment went through. Tap below to finish activating your account.
              If you still can&apos;t get in, email support@swiftdroom.com.
            </p>
            <button
              type="button"
              onClick={handleGoToDashboard}
              disabled={activating}
              className="mt-8 inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            >
              {activating ? "Activating..." : "Go to dashboard"}
            </button>
            <p className="mt-4">
              <Link href="/support" className="text-sm text-neutral-500 underline">
                Need help?
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
