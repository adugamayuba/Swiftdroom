"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Play, RefreshCw, CheckCircle2, Clock, XCircle, SkipForward } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

interface AutoApplySettings {
  enabled: boolean;
  minMatchScore: number;
  dailyLimit: number;
  coverLetter: string;
  totalApplied: number;
}

interface QueueJob {
  id: string;
  status: "pending" | "applied" | "failed" | "skipped";
  atsType: string;
  error: string;
  appliedAt: string | null;
  createdAt: string;
  company: string;
  title: string;
  location: string;
  applyUrl: string;
}

const STATUS_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  applied:  { label: "Applied",  color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  pending:  { label: "Pending",  color: "bg-amber-100 text-amber-700",    icon: Clock },
  failed:   { label: "Failed",   color: "bg-red-100 text-red-600",         icon: XCircle },
  skipped:  { label: "Skipped",  color: "bg-neutral-100 text-neutral-500", icon: SkipForward },
};

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.pending;
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.color}`}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

export default function AutoApplyPage() {
  const [settings, setSettings] = useState<AutoApplySettings | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [appliedToday, setAppliedToday] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [minScore, setMinScore] = useState(75);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [coverLetter, setCoverLetter] = useState("");

  const loadData = useCallback(async () => {
    const [settingsRes, queueRes] = await Promise.all([
      apiFetch("/api/auto-apply/settings"),
      apiFetch("/api/auto-apply/queue"),
    ]);
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setSettings(data.settings);
      setAppliedToday(data.appliedToday);
      setTotalPending(data.totalPending);
      setEnabled(data.settings.enabled);
      setMinScore(data.settings.minMatchScore);
      setDailyLimit(data.settings.dailyLimit);
      setCoverLetter(data.settings.coverLetter || "");
    }
    if (queueRes.ok) {
      const data = await queueRes.json();
      setJobs(data.jobs || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function saveSettings() {
    setSaving(true);
    await apiFetch("/api/auto-apply/settings", {
      method: "PUT",
      body: JSON.stringify({ enabled, minMatchScore: minScore, dailyLimit, coverLetter }),
    });
    await loadData();
    setSaving(false);
  }

  async function runNow() {
    setRunning(true);
    await apiFetch("/api/auto-apply/run", { method: "POST" });
    await loadData();
    setRunning(false);
  }

  if (loading) return <DashboardSpinner />;

  const appliedJobs = jobs.filter((j) => j.status === "applied");
  const pendingJobs = jobs.filter((j) => j.status === "pending");
  const failedJobs  = jobs.filter((j) => j.status === "failed");

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <DashboardPageHeader
        title="Auto Apply"
        subtitle="Your AI agent finds matching jobs and submits applications for you — 24 hours a day"
        action={
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              enabled
                ? "bg-emerald-100 text-emerald-700"
                : "bg-neutral-100 text-neutral-500"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
              {enabled ? "Agent running" : "Agent paused"}
            </div>
            <button
              type="button"
              onClick={() => void runNow()}
              disabled={running || !enabled}
              className="app-btn-primary !py-2"
            >
              <Play className={`h-4 w-4 ${running ? "animate-pulse" : ""}`} />
              {running ? "Running…" : "Run now"}
            </button>
          </div>
        }
      />

      {/* Stats row */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          { label: "Applied today",   value: appliedToday },
          { label: "In queue",        value: totalPending },
          { label: "All time",        value: settings?.totalApplied ?? 0 },
        ].map(({ label, value }) => (
          <DashboardCard key={label} className="p-5 text-center">
            <p className="text-3xl font-semibold tabular-nums text-[var(--brand-header)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--brand-header)]/45">{label}</p>
          </DashboardCard>
        ))}
      </div>

      {/* Settings card */}
      <DashboardCard className="mt-6 divide-y divide-[var(--border)]">
        {/* Toggle */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-header)]">AI agent</p>
            <p className="mt-0.5 text-xs text-[var(--brand-header)]/55">
              Runs every 15 minutes, applies to matching Greenhouse &amp; Lever jobs
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
              enabled ? "bg-emerald-500" : "bg-[var(--brand-header)]/20"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                enabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Controls */}
        <div className="grid gap-5 px-5 py-5 sm:grid-cols-2">
          <div>
            <label className="app-label">Minimum match score to apply</label>
            <div className="mt-2 flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="flex-1 accent-[var(--brand-header)]"
              />
              <span className="w-10 text-right text-sm font-bold text-[var(--brand-header)]">
                {minScore}%
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--brand-header)]/40">
              Only apply to jobs above this match score
            </p>
          </div>
          <div>
            <label className="app-label">Daily application cap</label>
            <input
              type="number"
              className="app-input mt-1"
              min={1}
              max={50}
              value={dailyLimit}
              onChange={(e) =>
                setDailyLimit(Math.max(1, Math.min(50, Number(e.target.value))))
              }
            />
            <p className="mt-1 text-xs text-[var(--brand-header)]/40">
              Max applications per day (counts toward monthly plan limit)
            </p>
          </div>
        </div>

        {/* Cover letter */}
        <div className="px-5 py-5">
          <label className="app-label">Cover letter / additional note (optional)</label>
          <textarea
            className="app-input mt-1 min-h-[7rem] resize-y"
            placeholder="A short note included with every application. Keep it generic and professional…"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
        </div>

        {/* Save */}
        <div className="flex justify-end px-5 py-4">
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="app-btn-primary"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </DashboardCard>

      {/* Queue */}
      <div className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[var(--brand-header)]">Application queue</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="flex items-center gap-1 text-xs text-[var(--brand-header)]/45 hover:text-[var(--brand-header)]"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border)] p-10 text-center text-sm text-[var(--brand-header)]/45">
            No jobs in the queue yet. Enable the agent above, then click Run now to start.
          </div>
        ) : (
          <div className="space-y-4">
            {([
              { list: appliedJobs,  label: `Applied (${appliedJobs.length})`,    labelColor: "text-emerald-600" },
              { list: pendingJobs,  label: `Queued (${pendingJobs.length})`,     labelColor: "text-amber-600" },
              { list: failedJobs,   label: `Failed (${failedJobs.length})`,      labelColor: "text-red-500" },
            ] as const).filter((g) => g.list.length > 0).map((group) => (
              <div key={group.label}>
                <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${group.labelColor}`}>
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.list.map((job) => (
                    <DashboardCard key={job.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status={job.status} />
                            {job.atsType && (
                              <span className="rounded-full bg-[var(--brand-tag-bg)] px-2 py-0.5 text-xs capitalize text-[var(--brand-tag-text)]">
                                {job.atsType}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-[var(--brand-header)]">
                            {job.title}
                          </p>
                          <p className="text-xs text-[var(--brand-header)]/55">{job.company}</p>
                          {job.appliedAt && (
                            <p className="mt-0.5 text-xs text-[var(--brand-header)]/35">
                              {new Date(job.appliedAt).toLocaleString("en-US", {
                                month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit",
                              })}
                            </p>
                          )}
                          {job.error && (
                            <p className="mt-1 text-xs text-red-500">{job.error}</p>
                          )}
                        </div>
                        <a
                          href={job.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[var(--brand-header)]/35 hover:text-[var(--brand-header)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </DashboardCard>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
