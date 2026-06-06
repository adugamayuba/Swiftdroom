"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function AdminSLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const configError = searchParams.get("error") === "not_configured";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/admin/s/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    router.replace("/admin/s");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-neutral-900">Admin access</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Enter the admin password configured on Railway.
        </p>

        {configError && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ADMIN_PASSWORD is not set on the server.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6">
          <label className="block text-sm font-medium text-neutral-700">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-md bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
