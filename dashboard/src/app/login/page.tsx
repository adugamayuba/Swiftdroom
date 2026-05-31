"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Login failed"); return; }
    if (data.sessionToken) setSessionToken(data.sessionToken);
    if (data.apiToken) localStorage.setItem("swiftdroom_api_token", data.apiToken);
    router.push(data.redirectTo || "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="block text-center text-lg font-extrabold tracking-tight text-neutral-950">
          Swiftdroom
        </Link>

        <h1 className="mt-8 text-2xl font-bold text-neutral-950">Sign in</h1>
        <p className="mt-1 text-sm text-neutral-500">Welcome back</p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-neutral-950 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          No account?{" "}
          <Link href="/register" className="font-semibold text-neutral-900 underline underline-offset-4">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  );
}
