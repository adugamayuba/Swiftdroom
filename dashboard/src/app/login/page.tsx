"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { apiFetch, setSessionToken } from "@/lib/api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    if (data.sessionToken) {
      setSessionToken(data.sessionToken);
    }
    if (data.apiToken) {
      localStorage.setItem("swiftdroom_api_token", data.apiToken);
    }

    router.push(data.redirectTo || "/dashboard");
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="app-card p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--brand-header)]">Log in</h1>
        <p className="mt-1 text-sm text-[var(--brand-header)]/55">Access your dashboard</p>

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 space-y-4">
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
            <label className="app-label">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="app-input"
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="app-btn-primary mt-6 w-full">
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-[var(--brand-header)]/55">
          No account?{" "}
          <Link href="/register" className="font-medium text-[var(--brand-header)] hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
