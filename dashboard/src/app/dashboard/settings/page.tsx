"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Globe } from "lucide-react";
import { PLANS } from "@/lib/plans";

export default function SettingsPage() {
  const [apiToken, setApiToken] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    remaining: 0,
    plan: "NONE",
    status: "NONE",
    periodEnd: null as string | null,
  });

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        if (data.apiToken) {
          setApiToken(data.apiToken);
          localStorage.setItem("swiftdroom_api_token", data.apiToken);
        }
        if (data.usage) setUsage(data.usage);
      }
      setLoading(false);
    }
    load();
  }, []);

  function copyToken() {
    navigator.clipboard.writeText(apiToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function openBillingPortal() {
    setBillingLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setBillingLoading(false);
    if (data.url) window.location.href = data.url;
  }

  const planName =
    usage.plan !== "NONE"
      ? PLANS[usage.plan as keyof typeof PLANS]?.name
      : "No plan";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-neutral-900">Settings</h1>
      <p className="mt-1 text-neutral-500">Account, billing, and extension setup</p>

      <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-neutral-900">Subscription</h2>
        <div className="mt-4 flex items-center justify-between">
          <div>
            <p className="font-medium text-neutral-900">{planName}</p>
            <p className="text-sm capitalize text-neutral-500">
              {usage.status.toLowerCase()}
              {usage.periodEnd &&
                ` · Renews ${new Date(usage.periodEnd).toLocaleDateString()}`}
            </p>
          </div>
          <button
            onClick={openBillingPortal}
            disabled={billingLoading}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {billingLoading ? "Loading..." : "Manage billing"}
          </button>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-600">Applications this period</span>
            <span className="font-medium text-neutral-900">
              {usage.used} / {usage.limit}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-neutral-900"
              style={{
                width: `${usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0}%`,
              }}
            />
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-neutral-600" />
          <div>
            <h2 className="font-medium text-neutral-900">Extension API token</h2>
            <p className="text-sm text-neutral-500">
              Paste this in the Chrome extension to connect your account
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-neutral-100 px-4 py-3 font-mono text-sm">
            {loading ? "Loading..." : apiToken}
          </code>
          <button
            onClick={copyToken}
            disabled={!apiToken}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-4 py-3 text-sm font-medium hover:bg-neutral-50 disabled:opacity-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </button>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-neutral-900">Install extension</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-600">
          <li>Open chrome://extensions and enable Developer mode</li>
          <li>Load unpacked and select the extension/ folder</li>
          <li>Open the side panel and paste your API token</li>
          <li>Navigate to a job application and click Scan & Autofill</li>
        </ol>
      </section>
    </div>
  );
}
