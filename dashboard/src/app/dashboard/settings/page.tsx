"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { PLANS } from "@/lib/plans";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

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

    const handler = () => setExtensionConnected(true);
    window.addEventListener("swiftdroom:connected", handler);

    try {
      // @ts-expect-error chrome injected by extension
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

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-xl">
      <DashboardPageHeader
        title="Settings"
        subtitle="Manage your subscription and Chrome extension."
      />

      <DashboardCard className="mt-8 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="al-section-tag">Plan</p>
            <p className="mt-2 text-lg font-semibold text-[var(--brand-header)]">{planName}</p>
            <p className="text-sm capitalize text-[var(--brand-header)]/55">
              {usage.status.toLowerCase()}
              {usage.periodEnd &&
                ` · renews ${new Date(usage.periodEnd).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
            </p>
          </div>
          <button
            onClick={openBillingPortal}
            disabled={billingLoading}
            className="app-btn-secondary shrink-0"
          >
            {billingLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Manage billing"}
          </button>
        </div>

        {usage.limit > 0 && (
          <div className="mt-5">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--brand-header)]/55">Applications used</span>
              <span className="font-semibold text-[var(--brand-header)]">
                {usage.used} / {usage.limit}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--brand-mint)]">
              <div
                className="h-full rounded-full bg-[var(--brand-header)] transition-all"
                style={{ width: `${usagePct}%` }}
              />
            </div>
          </div>
        )}
      </DashboardCard>

      <DashboardCard className="mt-5 p-6">
        <p className="al-section-tag">Chrome Extension</p>

        {extensionConnected ? (
          <div className="mt-3 flex items-center gap-2 text-emerald-700">
            <Check className="h-5 w-5" />
            <span className="font-semibold">Extension connected</span>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-[var(--brand-header)]/65">
              Install the extension, then visit any page on your dashboard — it connects
              automatically. No API keys needed.
            </p>
            <a
              href={CWS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="app-btn-primary mt-4"
            >
              Add to Chrome
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-[var(--brand-header)]/45">
              After installing, come back to this page and it will auto-connect.
            </p>
          </>
        )}
      </DashboardCard>
    </div>
  );
}
