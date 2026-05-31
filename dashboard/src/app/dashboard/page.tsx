"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Globe, FileText, Users, Briefcase } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface OverviewData {
  name: string | null;
  profileComplete: boolean;
  personaCount: number;
  applicationCount: number;
}

export default function DashboardOverview() {
  const [data, setData] = useState<OverviewData | null>(null);

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
      const profile = profileRes.ok
        ? (await profileRes.json()).profile
        : null;
      const personas = personasRes.ok
        ? (await personasRes.json()).personas
        : [];
      const apps = appsRes.ok ? await appsRes.json() : { applications: [] };

      const profileComplete = Boolean(
        profile?.fullName && profile?.email && profile?.resumeText
      );

      setData({
        name: me.name,
        profileComplete,
        personaCount: personas.length,
        applicationCount: apps.applications?.length ?? 0,
      });
    }

    load();
  }, []);

  if (!data) {
    return <p className="text-slate-500">Loading overview...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">
        Welcome{data.name ? `, ${data.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-slate-500">Your job application command center</p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <StatCard
          icon={FileText}
          label="Profile"
          value={data.profileComplete ? "Complete" : "Incomplete"}
          href="/dashboard/profile"
          accent={data.profileComplete ? "green" : "amber"}
        />
        <StatCard
          icon={Users}
          label="Personas"
          value={`${data.personaCount} configured`}
          href="/dashboard/personas"
        />
        <StatCard
          icon={Briefcase}
          label="Applications tracked"
          value={String(data.applicationCount)}
          href="/dashboard/applications"
        />
      </div>

      <div className="mt-8 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Globe className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-900">
              Install the Chrome extension
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Load the extension from the{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs">
                extension/
              </code>{" "}
              folder, then paste your API token from Settings to connect.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Get your API token
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {!data.profileComplete && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">
            <strong>Next step:</strong> Complete your profile with baseline info
            and paste your resume text so the extension can autofill and generate
            tailored answers.
          </p>
          <Link
            href="/dashboard/profile"
            className="mt-2 inline-block text-sm font-medium text-amber-900 underline"
          >
            Go to Profile →
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href: string;
  accent?: "green" | "amber";
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p
            className={`text-lg font-semibold ${
              accent === "green"
                ? "text-emerald-600"
                : accent === "amber"
                  ? "text-amber-600"
                  : "text-slate-900"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </Link>
  );
}
