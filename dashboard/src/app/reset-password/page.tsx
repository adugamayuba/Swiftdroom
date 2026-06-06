"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { apiFetch } from "@/lib/api-client";
import { friendlyUserMessage } from "@/lib/user-messages";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const res = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(friendlyUserMessage(data.error, "We couldn't reset your password. Try again."));
      return;
    }

    router.push("/login");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="app-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--brand-header)]">
          Reset password
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-header)]/55">
          Choose a new password for your account.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="app-label">New password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
            />
          </div>
          <div>
            <label className="app-label">Confirm password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="app-input"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="app-btn-primary mt-6 w-full">
          {loading ? "Saving..." : "Update password"}
        </button>

        <p className="mt-4 text-center text-sm text-[var(--brand-header)]/55">
          <Link href="/forgot-password" className="font-medium text-[var(--brand-header)] hover:underline">
            Request a new link
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <div className="app-card p-8 shadow-sm text-sm text-[var(--brand-header)]/55">
            Loading...
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
