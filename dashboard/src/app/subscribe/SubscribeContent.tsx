"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PLANS, type PlanId } from "@/lib/plans";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { USER_MESSAGES, friendlyUserMessage } from "@/lib/user-messages";

export default function SubscribePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [userState, setUserState] = useState<{
    onboardingComplete: boolean;
    hasActiveSubscription: boolean;
    referralDiscountAvailable?: boolean;
    signupPromoCode?: string;
  } | null>(null);

  useEffect(() => {
    apiFetch("/api/me")
      .then((r) => {
        if (!r.ok) {
          router.push("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!data.onboardingComplete) {
          router.push("/onboarding");
          return;
        }
        if (data.hasActiveSubscription) {
          router.push("/dashboard");
          return;
        }
        setUserState(data);
      });
  }, [router]);

  async function handleSubscribe(planId: PlanId) {
    setLoading(planId);
    setCheckoutError("");
    trackEvent("subscribe_checkout", { plan: planId });

    try {
      const res = await apiFetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ planId }),
      });

      let data: { error?: string; url?: string | null; activated?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        setCheckoutError(USER_MESSAGES.network);
        return;
      }

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        setCheckoutError(
          friendlyUserMessage(
            data.error,
            "We couldn't start checkout. Please try again in a moment."
          )
        );
        return;
      }

      if (data.activated) {
        trackEvent("subscribe_activated", { plan: planId });
        router.push("/dashboard");
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setCheckoutError(
        "We couldn't open the payment page. Please try again or contact support@swiftdroom.com."
      );
    } catch {
      setCheckoutError(USER_MESSAGES.network);
    } finally {
      setLoading(null);
    }
  }

  if (!userState) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  const canceled = searchParams.get("canceled");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-lg font-semibold text-neutral-900">
            Swiftdroom
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Choose your plan
        </h1>
        <p className="mt-2 text-neutral-600">
          Subscribe to unlock everything — matched job feed, dashboard, Chrome
          extension, and AI autofill. No free tier.
        </p>

        {canceled && (
          <div className="mt-6 rounded-md border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-600">
            Checkout was canceled. Select a plan when you are ready.
          </div>
        )}

        {checkoutError && (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {checkoutError}
          </div>
        )}

        {userState.referralDiscountAvailable && (
          <div className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {userState.signupPromoCode === "WELCOME"
              ? "Code WELCOME applied — 20% off your first subscription."
              : "Your referral discount is applied — 20% off your first subscription."}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {(["STARTER", "PRO", "BUSINESS"] as PlanId[]).map((planId) => {
            const plan = PLANS[planId];
            return (
              <div
                key={planId}
                className={`rounded-lg border bg-white p-6 ${
                  plan.popular ? "border-neutral-900" : "border-neutral-200"
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Most popular
                  </span>
                )}
                <h2 className="mt-1 text-lg font-semibold">{plan.name}</h2>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-semibold">{plan.priceLabel}</span>
                  <span className="text-sm text-neutral-500">/mo</span>
                </div>
                <p className="mt-2 text-sm text-neutral-600">
                  {plan.applicationsLimit} applications per month
                </p>
                <ul className="mt-6 space-y-2">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="text-sm text-neutral-600">
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSubscribe(planId)}
                  disabled={loading !== null}
                  className={`mt-8 w-full rounded-md py-2.5 text-sm font-medium ${
                    plan.popular
                      ? "bg-neutral-900 text-white hover:bg-neutral-800"
                      : "border border-neutral-300 text-neutral-900 hover:bg-neutral-50"
                  } disabled:opacity-50`}
                >
                  {loading === planId ? "Redirecting..." : "Subscribe"}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
