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
    <div className="flex min-h-screen bg-slate-950">
      {/* Left glow panel */}
      <div className="relative hidden w-1/2 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-slate-900 to-slate-950" />
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-3xl" />
        <div className="relative">
          <Link href="/" className="text-xl font-bold text-white">
            Swift<span className="text-indigo-400">droom</span>
          </Link>
        </div>
        <div className="relative">
          <blockquote className="text-2xl font-bold leading-snug text-white">
            "Apply to jobs 10× faster with AI-powered autofill."
          </blockquote>
          <p className="mt-4 text-white/40">Workday · Greenhouse · Lever · Any career page</p>
        </div>
        <div className="relative text-sm text-white/20">© 2026 Swiftdroom</div>
      </div>

      {/* Right form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-2 lg:hidden">
            <Link href="/" className="text-xl font-bold text-white">
              Swift<span className="text-indigo-400">droom</span>
            </Link>
          </div>

          <h1 className="text-3xl font-bold text-white">Welcome back</h1>
          <p className="mt-2 text-white/40">Sign in to your account</p>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="you@email.com"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/70">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/40">
            No account?{" "}
            <Link href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
