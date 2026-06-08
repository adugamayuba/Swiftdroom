"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, RefreshCw } from "lucide-react";
import { apiFetch, readApiError } from "@/lib/api-client";
import { friendlyUserMessage } from "@/lib/user-messages";
import { trackEvent } from "@/lib/analytics";
import { PLANS } from "@/lib/plans";
import { getChromeWebStoreUrl } from "@/lib/chrome-store";
import {
  persistApiToken,
  useExtensionConnected,
} from "@/lib/extension-client";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const extensionConnected = useExtensionConnected();
  const chromeStoreUrl = getChromeWebStoreUrl();
  const [usage, setUsage] = useState({
    used: 0,
    limit: 0,
    plan: "NONE",
    status: "NONE",
    periodEnd: null as string | null,
  });
  const [notifications, setNotifications] = useState({
    login: true,
    applications: true,
    billing: true,
  });

  useEffect(() => {
    Promise.all([apiFetch("/api/me"), apiFetch("/api/settings/notifications")]).then(
      async ([meRes, settingsRes]) => {
        if (meRes.ok) {
          const data = await meRes.json();
          if (data.apiToken) persistApiToken(data.apiToken);
          if (data.usage) setUsage(data.usage);
        }
        if (settingsRes.ok) {
          const settings = await settingsRes.json();
          setNotifications(settings);
        }
        setLoading(false);
      }
    );

  }, []);

  async function openBillingPortal() {
    setBillingLoading(true);
    setNotificationMessage("");
    const res = await apiFetch("/api/stripe/portal", { method: "POST" });
    const data = await res.json();
    setBillingLoading(false);
    if (!res.ok) {
      setNotificationMessage(
        friendlyUserMessage(
          data.error,
          "We couldn't open billing. Please try again."
        )
      );
      return;
    }
    if (data.url) window.location.href = data.url;
  }

  async function updateNotification(
    key: keyof typeof notifications,
    value: boolean
  ) {
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    setSavingNotifications(true);
    setNotificationMessage("");

    const res = await apiFetch("/api/settings/notifications", {
      method: "PATCH",
      body: JSON.stringify({ [key]: value }),
    });
    setSavingNotifications(false);

    if (!res.ok) {
      setNotifications(notifications);
      setNotificationMessage("We couldn't save your email preferences. Try again.");
      return;
    }

    setNotificationMessage("Email preferences saved.");
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
        <p className="al-section-tag">Email notifications</p>
        <p className="mt-2 text-sm text-[var(--brand-header)]/65">
          Choose which updates we send to your inbox.
        </p>

        <div className="mt-5 space-y-4">
          {(
            [
              {
                key: "login" as const,
                label: "Sign-in alerts",
                description: "Get notified when someone signs in to your account.",
              },
              {
                key: "applications" as const,
                label: "Application submissions",
                description: "Get a confirmation when a new application is logged.",
              },
              {
                key: "billing" as const,
                label: "Billing updates",
                description: "Subscription activations and payment issues.",
              },
            ] as const
          ).map(({ key, label, description }) => (
            <label
              key={key}
              className="flex items-start justify-between gap-4 rounded-md border border-[var(--brand-mint)] px-4 py-3"
            >
              <span>
                <span className="block text-sm font-medium text-[var(--brand-header)]">
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--brand-header)]/55">
                  {description}
                </span>
              </span>
              <input
                type="checkbox"
                checked={notifications[key]}
                disabled={savingNotifications}
                onChange={(e) => updateNotification(key, e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--brand-header)]"
              />
            </label>
          ))}
        </div>

        {notificationMessage && (
          <p className="mt-3 text-xs text-[var(--brand-header)]/55">{notificationMessage}</p>
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
              href={chromeStoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("extension_install_click", { source: "settings" })}
              className="app-btn-primary mt-4"
            >
              Add to Chrome
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="mt-3 text-xs text-[var(--brand-header)]/45">
              After installing, refresh this page — the extension connects automatically.
            </p>
          </>
        )}
      </DashboardCard>
    </div>
  );
}
