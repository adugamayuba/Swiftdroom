"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ExternalLink, Send } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import { getChromeWebStoreUrl } from "@/lib/chrome-store";
import {
  persistApiToken,
  useExtensionConnected,
} from "@/lib/extension-client";
import { DashboardCard, DashboardSpinner } from "@/components/dashboard/ui";

interface DashboardData {
  name: string | null;
  plan: string;
  used: number;
  limit: number;
  profileComplete: boolean;
  personaCount: number;
  applicationCount: number;
}

interface AutoApplyStats {
  enabled: boolean;
  totalApplied: number;
  appliedToday: number;
  totalPending: number;
}

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [autoApply, setAutoApply] = useState<AutoApplyStats | null>(null);
  const extensionConnected = useExtensionConnected();
  const chromeStoreUrl = getChromeWebStoreUrl();

  const load = useCallback(async () => {
    const [meRes, profileRes, personasRes, appsRes, aaRes] = await Promise.all([
      apiFetch("/api/me"),
      apiFetch("/api/profile"),
      apiFetch("/api/personas"),
      apiFetch("/api/applications"),
      apiFetch("/api/auto-apply/settings"),
    ]);
    if (!meRes.ok) return;
    const me = await meRes.json();
    const profile = profileRes.ok ? (await profileRes.json()).profile : null;
    const personas = personasRes.ok ? (await personasRes.json()).personas : [];
    const apps = appsRes.ok ? (await appsRes.json()).applications : [];

    if (me.apiToken) persistApiToken(me.apiToken);

    setData({
      name: me.name,
      plan: me.plan,
      used: me.usage?.used ?? 0,
      limit: me.usage?.limit ?? 0,
      profileComplete: Boolean(profile?.fullName && profile?.email && profile?.resumeText),
      personaCount: personas.length,
      applicationCount: apps.length,
    });

    if (aaRes.ok) {
      const aa = await aaRes.json();
      setAutoApply({
        enabled: aa.settings?.enabled ?? false,
        totalApplied: aa.settings?.totalApplied ?? 0,
        appliedToday: aa.appliedToday ?? 0,
        totalPending: aa.totalPending ?? 0,
      });
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!data) return <DashboardSpinner />;

  const steps = [
    {
      done: data.profileComplete,
      label: "Complete your profile",
      sub: "Upload your resume — the AI agent needs it to fill applications.",
      href: "/dashboard/profile",
      cta: "Go to Profile",
    },
    {
      done: data.plan !== "NONE",
      label: "Choose a plan",
      sub: "Subscribe to activate your AI agent and the Chrome extension.",
      href: "/subscribe",
      cta: "View plans",
    },
    {
      done: autoApply?.enabled ?? false,
      label: "Enable Auto Apply",
      sub: "Turn it on and Swiftdroom will start submitting applications for you.",
      href: "/dashboard/auto-apply",
      cta: "Enable",
    },
  ];

  const allDone = steps.every((s) => s.done);

  return (
    <div className="max-w-2xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--brand-header)]">
            {data.name ? `Hey, ${data.name.split(" ")[0]}.` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-[var(--brand-header)]/55">
            {autoApply?.enabled
              ? "Swiftdroom is applying to jobs for you in the background."
              : "Turn on Auto Apply to start submitting applications automatically."}
          </p>
        </div>
        {data.limit > 0 && (
          <div className="rounded-lg border border-[var(--border)] bg-white px-4 py-3 text-right">
            <p className="text-2xl font-semibold text-[var(--brand-header)]">
              {data.used}
              <span className="text-sm font-normal text-[var(--brand-header)]/45">
                /{data.limit}
              </span>
            </p>
            <p className="text-xs text-[var(--brand-header)]/45">applications this month</p>
          </div>
        )}
      </div>

      {/* Auto Apply card */}
      <div className="mt-6 overflow-hidden rounded-xl bg-[var(--brand-header)]">
        <div className="px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Send className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Auto Apply</p>
                <p className="mt-0.5 text-xs text-white/55">
                  {autoApply?.enabled
                    ? "On — finding and submitting jobs for you"
                    : "Off — turn on to start applying automatically"}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/auto-apply"
              className="shrink-0 rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[var(--brand-header)] transition hover:bg-white/90"
            >
              {autoApply?.enabled ? "View" : "Set up"}
            </Link>
          </div>
        </div>
        {autoApply?.enabled && (
          <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
            {[
              { label: "Applied today", value: autoApply.appliedToday },
              { label: "In queue",      value: autoApply.totalPending },
              { label: "All time",      value: autoApply.totalApplied },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3 text-center">
                <p className="text-xl font-semibold text-white">{value}</p>
                <p className="text-xs text-white/45">{label}</p>
              </div>
            ))}
          </div>
        )}
        {!autoApply?.enabled && (
          <div className="border-t border-white/10 px-5 py-3">
            <p className="text-xs text-white/40">
              Complete your profile and subscribe to get started
            </p>
          </div>
        )}
      </div>

      {!allDone && (
        <DashboardCard className="mt-4 overflow-hidden">
          <div className="border-b border-[var(--border)] bg-[var(--brand-mint)]/50 px-5 py-4">
            <p className="text-sm font-semibold text-[var(--brand-header)]">Getting started</p>
            <p className="text-xs text-[var(--brand-header)]/55">
              {steps.filter((s) => s.done).length} of {steps.length} complete
            </p>
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {steps.map((step) => (
              <li
                key={step.label}
                className={`flex items-start gap-3 px-5 py-4 ${step.done ? "opacity-50" : ""}`}
              >
                {step.done ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brand-header)]/25" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      step.done
                        ? "text-[var(--brand-header)]/45 line-through"
                        : "text-[var(--brand-header)]"
                    }`}
                  >
                    {step.label}
                  </p>
                  {!step.done && (
                    <p className="mt-0.5 text-xs text-[var(--brand-header)]/55">{step.sub}</p>
                  )}
                </div>
                {!step.done && (
                  <Link
                    href={step.href}
                    className="app-btn-secondary shrink-0 !px-3 !py-1.5 !text-xs"
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Jobs",         desc: "Matched roles for you",          href: "/dashboard/jobs" },
          { label: "Applications", desc: `${data.applicationCount} tracked`, href: "/dashboard/applications" },
          { label: "Profile",      desc: "Resume & contact details",        href: "/dashboard/profile" },
          { label: "Personas",     desc: `${data.personaCount} configured`, href: "/dashboard/personas" },
          { label: "Settings",     desc: "Plan & extension",                href: "/dashboard/settings" },
          { label: "Extension",    desc: "Install for Workday & more",      href: chromeStoreUrl, external: true },
        ].map(({ label, desc, href, external }) =>
          external ? (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent("extension_install_click", { source: "overview" })}
              className="app-card flex items-center justify-between p-4 transition hover:border-[var(--brand-header)]/25 hover:shadow-sm"
            >
              <div>
                <p className="text-sm font-semibold text-[var(--brand-header)]">{label}</p>
                <p className="mt-0.5 text-xs text-[var(--brand-header)]/45">{desc}</p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-[var(--brand-header)]/30" />
            </a>
          ) : (
            <Link
              key={label}
              href={href}
              className="app-card p-4 transition hover:border-[var(--brand-header)]/25 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-[var(--brand-header)]">{label}</p>
              <p className="mt-0.5 text-xs text-[var(--brand-header)]/45">{desc}</p>
            </Link>
          )
        )}
      </div>
    </div>
  );
}
