"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { apiFetch } from "@/lib/api-client";
import { friendlyUserMessage } from "@/lib/user-messages";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const res = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(friendlyUserMessage(data.error, "We couldn't send the reset email. Try again."));
      return;
    }

    setMessage(
      data.message ||
        "If an account exists for that email, we sent password reset instructions."
    );
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="app-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--brand-header)]">
          Forgot password
        </h1>
        <p className="mt-1 text-sm text-[var(--brand-header)]/55">
          Enter your email and we&apos;ll send a reset link.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {message && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {message}
          </div>
        )}

        <div className="mt-6">
          <label className="app-label">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="app-input"
          />
        </div>

        <button type="submit" disabled={loading} className="app-btn-primary mt-6 w-full">
          {loading ? "Sending..." : "Send reset link"}
        </button>

        <p className="mt-4 text-center text-sm text-[var(--brand-header)]/55">
          <Link href="/login" className="font-medium text-[var(--brand-header)] hover:underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
