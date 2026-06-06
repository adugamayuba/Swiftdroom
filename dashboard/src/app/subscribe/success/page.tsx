"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

export default function SubscribeSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"waiting" | "active" | "timeout">("waiting");

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const poll = async () => {
      const res = await apiFetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        if (data.hasActiveSubscription) {
          setStatus("active");
          router.push("/dashboard");
          return;
        }
      }
      attempts++;
      if (attempts >= maxAttempts) {
        setStatus("timeout");
        return;
      }
      setTimeout(poll, 1500);
    };

    poll();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="max-w-md text-center">
        {status === "waiting" && (
          <>
            <h1 className="text-2xl font-semibold text-neutral-900">
              Confirming your payment...
            </h1>
            <p className="mt-4 text-neutral-600">
              Stripe is processing your subscription. This usually takes a few seconds.
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
              Your payment succeeded but activation is still syncing. Refresh in a minute
              or contact support if access does not appear.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-block rounded-md bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Go to dashboard
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
