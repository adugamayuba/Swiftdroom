"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ExternalLink } from "lucide-react";
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

export default function DashboardOverview() {
  const [data, setData] = useState<DashboardData | null>(null);
  const extensionConnected = useExtensionConnected();
  const chromeStoreUrl = getChromeWebStoreUrl();

  useEffect(() => {
    async function load() {
      const [meRes, profileRes, personasRes, appsRes] = await Promise.all([
        apiFetch("/api/me"),
        apiFetch("/api/profile"),
        apiFetch("/api/personas"),
        apiFetch("/api/applications"),
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
    }
    load();
  }, []);

  if (!data) return <DashboardSpinner />;

  const steps = [
    {
      done: data.profileComplete,
      label: "Complete your profile",
      sub: "Upload your resume so the extension can autofill and generate answers.",
      href: "/dashboard/profile",
      cta: "Go to Profile",
    },
    {
      done: data.plan !== "NONE",
      label: "Choose a plan",
      sub: "Subscribe to unlock the Chrome extension.",
      href: "/subscribe",
      cta: "View plans",
    },
    {
      done: extensionConnected,
      label: "Install the Chrome extension",
      sub: "Add it from the Chrome Web Store — it connects automatically.",
      href: chromeStoreUrl,
      external: true,
      cta: "Add to Chrome",
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
            {data.applicationCount === 0
              ? "Let's get your first application tracked."
              : `${data.applicationCount} application${data.applicationCount !== 1 ? "s" : ""} tracked this month.`}
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
            <p className="text-xs text-[var(--brand-header)]/45">applications used</p>
          </div>
        )}
      </div>

      {!allDone && (
        <DashboardCard className="mt-8 overflow-hidden">
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
                {!step.done &&
                  (step.external ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent("extension_install_click", { source: "overview" })}
                      className="app-btn-primary shrink-0 !px-3 !py-1.5 !text-xs"
                    >
                      {step.cta}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={step.href}
                      className="app-btn-secondary shrink-0 !px-3 !py-1.5 !text-xs"
                    >
                      {step.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  ))}
              </li>
            ))}
          </ul>
        </DashboardCard>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: "Profile", desc: "Resume & contact details", href: "/dashboard/profile" },
          { label: "Personas", desc: `${data.personaCount} configured`, href: "/dashboard/personas" },
          {
            label: "Applications",
            desc: `${data.applicationCount} tracked`,
            href: "/dashboard/applications",
          },
          { label: "Settings", desc: "Plan & extension", href: "/dashboard/settings" },
        ].map(({ label, desc, href }) => (
          <Link
            key={label}
            href={href}
            className="app-card p-4 transition hover:border-[var(--brand-header)]/25 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[var(--brand-header)]">{label}</p>
            <p className="mt-0.5 text-xs text-[var(--brand-header)]/45">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
