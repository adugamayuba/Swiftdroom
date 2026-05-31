"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PLANS } from "@/lib/plans";

// Chrome Web Store link — update once the extension is published
const CWS_URL = "https://chromewebstore.google.com/detail/swiftdroom";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    plan: "NONE",
    status: "NONE",
    periodEnd: null as string | null,
  });

  useEffect(() => {
    apiFetch("/api/me").then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      if (data.apiToken) localStorage.setItem("swiftdroom_api_token", data.apiToken);
      if (data.usage) setUsage(data.usage);
      setLoading(false);
    });

    // Listen for the extension auto-connect event
    const handler = () => setExtensionConnected(true);
    window.addEventListener("swiftdroom:connected", handler);

    // If already connected (e.g. page re-load after connect), check via message
    try {
      // @ts-ignore — chrome is injected by the extension
      chrome.runtime?.sendMessage?.({ type: "PING" }, (res: unknown) => {
        if (res) setExtensionConnected(true);
      });
    } catch {}

    return () => window.removeEventListener("swiftdroom:connected", handler);
  }, []);

  async function openBillingPortal() {
    setBillingLoading(true);
    const res = await apiFetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setBillingLoading(false);
    if (data.url) window.location.href = data.url;
  }

  const planName =
    usage.plan !== "NONE" ? PLANS[usage.plan as keyof typeof PLANS]?.name : "No active plan";

  const usagePct = usage.limit
    ? Math.min(100, Math.round((usage.used / usage.limit) * 100))
    : 0;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
      <p className="mt-1 text-sm text-neutral-500">Manage your subscription and Chrome extension.</p>

      {/* Subscription */}
      <section className="mt-8 rounded-xl border border-neutral-200 bg-white p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Plan</p>
            <p className="mt-1 text-lg font-bold text-neutral-900">{planName}</p>
            <p className="text-sm capitalize text-neutral-500">
              {usage.status.toLowerCase()}
              {usage.periodEnd &&
                ` · renews ${new Date(usage.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </p>
          </div>
          <button
            onClick={openBillingPortal}
            disabled={billingLoading || loading}
            className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-40"
          >
            {billingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Manage billing"}
          </button>
        </div>

        {usage.limit > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Applications used</span>
              <span className="font-semibold text-neutral-900">{usage.used} / {usage.limit}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
              <div
                className="h-full rounded-full bg-neutral-900 transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Chrome Extension */}
      <section className="mt-5 rounded-xl border border-neutral-200 bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-400">Chrome Extension</p>

        {extensionConnected ? (
          <div className="mt-3 flex items-center gap-2 text-emerald-700">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Extension connected</span>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-neutral-600">
              Install the extension, then visit any page on your dashboard — it connects automatically. No API keys needed.
            </p>
            <a
              href={CWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              Add to Chrome
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-neutral-400">
              After installing, come back to this page and it will auto-connect.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
