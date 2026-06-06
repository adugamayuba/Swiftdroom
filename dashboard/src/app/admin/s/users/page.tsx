"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface SyncResult {
  activated: boolean;
  email: string;
  plan: string;
  subscriptionStatus: string;
  error?: string;
}

export default function AdminSUsersPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await apiFetch("/api/admin/s/sync-subscription", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult({
        activated: false,
        email: email.trim(),
        plan: "—",
        subscriptionStatus: "—",
        error: data.error || "Sync failed",
      });
      return;
    }

    setResult(data);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Subscription recovery</h1>
      <p className="mt-1 text-neutral-500">
        Sync a paid Stripe subscription when webhooks were missed.
      </p>

      <form
        onSubmit={handleSync}
        className="mt-8 max-w-lg rounded-lg border border-neutral-200 bg-white p-6"
      >
        <label className="block text-sm font-medium text-neutral-700">
          User email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@droomify.com"
          required
          className="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {loading ? "Syncing..." : "Sync from Stripe"}
        </button>
      </form>

      {result && (
        <div
          className={`mt-6 max-w-lg rounded-md border px-4 py-3 text-sm ${
            result.error
              ? "border-red-200 bg-red-50 text-red-700"
              : result.activated
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {result.error ? (
            <p>{result.error}</p>
          ) : result.activated ? (
            <p>
              Activated <strong>{result.email}</strong> on the{" "}
              <strong>{result.plan.toLowerCase()}</strong> plan (
              {result.subscriptionStatus.toLowerCase()}).
            </p>
          ) : (
            <p>
              No active Stripe subscription found for <strong>{result.email}</strong>.
              Check Stripe Dashboard for a paid checkout session.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
