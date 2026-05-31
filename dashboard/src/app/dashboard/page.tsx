"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const CWS_URL = "https://chromewebstore.google.com/detail/swiftdroom";

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
  const [extensionConnected, setExtensionConnected] = useState(false);

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

    const handler = () => setExtensionConnected(true);
    window.addEventListener("swiftdroom:connected", handler);
    return () => window.removeEventListener("swiftdroom:connected", handler);
  }, []);

  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

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
      href: CWS_URL,
      external: true,
      cta: "Add to Chrome",
    },
  ];

  const allDone = steps.every((s) => s.done);

  return (
    <div className="max-w-2xl">
      {/* Greeting */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            {data.name ? `Hey, ${data.name.split(" ")[0]}.` : "Dashboard"}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {data.applicationCount === 0
              ? "Let's get your first application tracked."
              : `${data.applicationCount} application${data.applicationCount !== 1 ? "s" : ""} tracked this month.`}
          </p>
        </div>
        {data.limit > 0 && (
          <div className="text-right">
            <p className="text-2xl font-bold text-neutral-900">{data.used}<span className="text-sm font-normal text-neutral-400">/{data.limit}</span></p>
            <p className="text-xs text-neutral-400">applications used</p>
          </div>
        )}
      </div>

      {/* Setup checklist — hide once all done */}
      {!allDone && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white">
          <div className="border-b border-neutral-100 px-5 py-4">
            <p className="text-sm font-semibold text-neutral-900">Getting started</p>
            <p className="text-xs text-neutral-400">{steps.filter(s => s.done).length} of {steps.length} complete</p>
          </div>
          <ul className="divide-y divide-neutral-100">
            {steps.map((step) => (
              <li key={step.label} className={`flex items-start gap-3 px-5 py-4 ${step.done ? "opacity-50" : ""}`}>
                {step.done
                  ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  : <Circle className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" />
                }
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${step.done ? "line-through text-neutral-400" : "text-neutral-900"}`}>
                    {step.label}
                  </p>
                  {!step.done && <p className="mt-0.5 text-xs text-neutral-500">{step.sub}</p>}
                </div>
                {!step.done && (
                  step.external ? (
                    <a
                      href={step.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-neutral-800"
                    >
                      {step.cta}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Link
                      href={step.href}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-50"
                    >
                      {step.cta}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick links */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { label: "Profile", desc: "Resume & contact details", href: "/dashboard/profile" },
          { label: "Personas", desc: `${data.personaCount} configured`, href: "/dashboard/personas" },
          { label: "Applications", desc: `${data.applicationCount} tracked`, href: "/dashboard/applications" },
          { label: "Settings", desc: "Plan & extension", href: "/dashboard/settings" },
        ].map(({ label, desc, href }) => (
          <Link
            key={label}
            href={href}
            className="rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-neutral-900">{label}</p>
            <p className="mt-0.5 text-xs text-neutral-400">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
