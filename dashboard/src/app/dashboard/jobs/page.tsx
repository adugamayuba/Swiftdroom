"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ExternalLink,
  MapPin,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";
import {
  DashboardCard,
  DashboardEmpty,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

type JobRegion = "all" | "us" | "international";

interface FeedItem {
  id: string;
  score: number;
  matchReason: string;
  status: string;
  company: string;
  title: string;
  location: string;
  region: string;
  remote: boolean;
  applyUrl: string;
  atsType: string;
  postedAt: string | null;
  description: string;
}

interface PersonaOption {
  id: string;
  name: string;
  focus: string;
  isDefault: boolean;
}

export default function JobsPage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [personas, setPersonas] = useState<PersonaOption[]>([]);
  const [region, setRegion] = useState<JobRegion>("all");
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [personaId, setPersonaId] = useState<string>("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const autoRefreshed = useRef(false);

  const loadFeed = useCallback(async () => {
    const res = await apiFetch("/api/jobs/feed");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.items || []);
    return (data.items || []) as FeedItem[];
  }, []);

  const runRefresh = useCallback(async () => {
    setRefreshing(true);
    const res = await apiFetch("/api/jobs/refresh", { method: "POST" });
    setRefreshing(false);
    if (!res.ok) return false;
    const data = await res.json();
    await loadFeed();
    if (data.refreshed) {
      trackEvent("job_feed_refresh", { region });
    }
    return Boolean(data.refreshed);
  }, [loadFeed, region]);

  const loadPrefs = useCallback(async () => {
    const res = await apiFetch("/api/jobs/preferences");
    if (!res.ok) {
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPersonas(data.personas || []);
    if (data.preferences) {
      setRegion(data.preferences.region || "all");
      setRemoteOnly(Boolean(data.preferences.remoteOnly));
      setPersonaId(data.preferences.personaId || "");
      setTargetRole(data.preferences.targetRole || "");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPrefs().then(async () => {
      const current = await loadFeed();
      if (!autoRefreshed.current && (!current || current.length === 0)) {
        autoRefreshed.current = true;
        await runRefresh();
      }
    });
  }, [loadPrefs, loadFeed, runRefresh]);

  async function savePreferences(updates: {
    targetRole?: string;
    region?: JobRegion;
    remoteOnly?: boolean;
    personaId?: string | null;
  }) {
    await apiFetch("/api/jobs/preferences", {
      method: "PUT",
      body: JSON.stringify(updates),
    });
  }

  async function handleTargetRoleBlur() {
    const trimmed = targetRole.trim();
    if (!trimmed) return;
    await savePreferences({ targetRole: trimmed });
  }

  async function handleRegionChange(next: JobRegion) {
    setRegion(next);
    await savePreferences({ region: next });
  }

  async function handleRemoteToggle(checked: boolean) {
    setRemoteOnly(checked);
    await savePreferences({ remoteOnly: checked });
  }

  async function handlePersonaChange(id: string) {
    setPersonaId(id);
    await savePreferences({ personaId: id || null });
  }

  async function updateItem(
    id: string,
    status: "saved" | "dismissed" | "active",
    meta?: { atsType?: string }
  ) {
    const res = await apiFetch(`/api/jobs/feed/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (status === "active" && data.applyUrl) {
      trackEvent("job_apply_click", { ats: meta?.atsType || "unknown" });
      window.open(data.applyUrl, "_blank", "noopener,noreferrer");
    }
    await loadFeed();
  }

  if (loading) return <DashboardSpinner />;

  return (
    <div className="max-w-3xl">
      <DashboardPageHeader
        title="Jobs for you"
        subtitle="Matched to your persona. Apply on the company site with the Swiftdroom extension."
        action={
          <button
            type="button"
            onClick={() => void runRefresh()}
            disabled={refreshing}
            className="app-btn-primary !py-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Searching…" : "Refresh feed"}
          </button>
        }
      />

      <DashboardCard className="mt-6 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="min-w-[220px] flex-1">
            <label className="app-label">Looking for</label>
            <input
              type="text"
              className="app-input mt-1"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              onBlur={() => void handleTargetRoleBlur()}
              placeholder="e.g. Software Engineer"
            />
          </div>
          <div>
            <label className="app-label">Region</label>
            <select
              className="app-input mt-1 !w-auto min-w-[140px]"
              value={region}
              onChange={(e) => void handleRegionChange(e.target.value as JobRegion)}
            >
              <option value="all">USA + International</option>
              <option value="us">USA only</option>
              <option value="international">International</option>
            </select>
          </div>
          <div>
            <label className="app-label">Persona</label>
            <select
              className="app-input mt-1 !w-auto min-w-[180px]"
              value={personaId}
              onChange={(e) => void handlePersonaChange(e.target.value)}
            >
              <option value="">Default persona</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.focus ? ` — ${p.focus}` : ""}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm text-[var(--brand-header)]/70">
            <input
              type="checkbox"
              checked={remoteOnly}
              onChange={(e) => void handleRemoteToggle(e.target.checked)}
              className="rounded border-[var(--border)]"
            />
            Remote only
          </label>
        </div>
      </DashboardCard>

      {refreshing && items.length === 0 ? (
        <div className="mt-8 flex justify-center">
          <DashboardSpinner />
        </div>
      ) : items.length === 0 ? (
        <DashboardEmpty
          className="mt-8"
          message="No jobs in your feed yet. Set your target role above, then refresh."
        />
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((job) => (
            <li key={job.id}>
              <DashboardCard className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-mint)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-header)]">
                        <Sparkles className="h-3 w-3" />
                        {job.score}% match
                      </span>
                      {job.atsType && (
                        <span className="rounded-full bg-[var(--brand-tag-bg)] px-2 py-0.5 text-xs text-[var(--brand-tag-text)]">
                          {job.atsType}
                        </span>
                      )}
                      {job.remote && (
                        <span className="text-xs text-[var(--brand-header)]/45">Remote</span>
                      )}
                      <span className="text-xs uppercase text-[var(--brand-header)]/40">
                        {job.region}
                      </span>
                    </div>
                    <h2 className="mt-2 text-lg font-semibold text-[var(--brand-header)]">
                      {job.title}
                    </h2>
                    <p className="text-sm text-[var(--brand-header)]/65">{job.company}</p>
                    {job.location && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-[var(--brand-header)]/45">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-[var(--brand-header)]/55">{job.matchReason}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void updateItem(job.id, "active", { atsType: job.atsType })
                      }
                      className="app-btn-primary !px-4 !py-2 text-sm"
                    >
                      Apply now
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      href={`/dashboard/jobs/tailor?company=${encodeURIComponent(job.company)}&role=${encodeURIComponent(job.title)}&jd=${encodeURIComponent(job.description.slice(0, 3000))}`}
                      className="app-btn-secondary !px-4 !py-1.5 text-center text-xs"
                    >
                      Tailor resume
                    </Link>
                    <button
                      type="button"
                      onClick={() => void updateItem(job.id, "saved")}
                      className="app-btn-secondary !px-4 !py-1.5 text-xs"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => void updateItem(job.id, "dismissed")}
                      className="flex items-center justify-center gap-1 text-xs text-[var(--brand-header)]/40 hover:text-[var(--brand-header)]/70"
                    >
                      <X className="h-3 w-3" />
                      Hide
                    </button>
                  </div>
                </div>
              </DashboardCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
