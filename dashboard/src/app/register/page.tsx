"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { apiFetch, setSessionToken } from "@/lib/api-client";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const refFromUrl = searchParams.get("ref")?.toUpperCase() || "";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState(refFromUrl);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        referralCode: referralCode.trim() || undefined,
      }),
    });

    let data: {
      error?: string;
      apiToken?: string;
      sessionToken?: string;
      redirectTo?: string;
    } = {};
    try {
      data = await res.json();
    } catch {
      setError(`Server error (${res.status}). Try again or check /api/health.`);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Registration failed");
      return;
    }

    if (data.sessionToken) {
      setSessionToken(data.sessionToken);
    }
    if (data.apiToken) {
      localStorage.setItem("swiftdroom_api_token", data.apiToken);
    }

    router.push(data.redirectTo || "/onboarding");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="app-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--brand-header)]">Create account</h1>
        <p className="mt-1 text-sm text-[var(--brand-header)]/55">
          Set up your profile, then choose a plan
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="app-label">Full name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="app-input"
            />
          </div>
          <div>
            <label className="app-label">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="app-input"
            />
          </div>
          <div>
            <label className="app-label">Referral code (optional)</label>
            <input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              placeholder="Friend's invite code"
              className="app-input"
            />
            {referralCode && (
              <p className="mt-1 text-xs text-[var(--brand-header)]/45">
                You&apos;ll get 20% off your first subscription.
              </p>
            )}
          </div>
          <div>
            <label className="app-label">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
            />
            <p className="mt-1 text-xs text-[var(--brand-header)]/45">Minimum 8 characters</p>
          </div>
        </div>

        <button type="submit" disabled={loading} className="app-btn-primary mt-6 w-full">
          {loading ? "Creating account..." : "Continue"}
        </button>

        <p className="mt-4 text-center text-xs text-[var(--brand-header)]/50">
          By creating an account, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-[var(--brand-header)]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-[var(--brand-header)]">
            Privacy Policy
          </Link>
          .
        </p>
        <p className="mt-3 text-center text-sm text-[var(--brand-header)]/55">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--brand-header)] hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <p className="text-center text-sm text-[var(--brand-header)]/50">Loading...</p>
        </AuthLayout>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
