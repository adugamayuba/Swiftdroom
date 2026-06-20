"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Play, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardEmpty,
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

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  applied: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-600",
  skipped: "bg-neutral-100 text-neutral-500",
};

export default function AutoApplyPage() {
  const [settings, setSettings] = useState<AutoApplySettings | null>(null);
  const [jobs, setJobs] = useState<QueueJob[]>([]);
  const [appliedToday, setAppliedToday] = useState(0);
  const [totalPending, setTotalPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // Local form state
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

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
  const failedJobs = jobs.filter((j) => j.status === "failed");

  return (
    <div className="max-w-3xl">
      <DashboardPageHeader
        title="Auto Apply"
        subtitle="Swiftdroom automatically submits applications on your behalf to Greenhouse and Lever jobs"
        action={
          <button
            type="button"
            onClick={() => void runNow()}
            disabled={running || !enabled}
            className="app-btn-primary !py-2"
          >
            <Play className={`h-4 w-4 ${running ? "animate-pulse" : ""}`} />
            {running ? "Running…" : "Run now"}
          </button>
        }
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        {[
          ["Applied today", appliedToday],
          ["Pending", totalPending],
          ["Total applied", settings?.totalApplied ?? 0],
        ].map(([label, value]) => (
          <DashboardCard key={label as string} className="p-4 text-center">
            <p className="text-2xl font-semibold text-[var(--brand-header)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--brand-header)]/45">{label}</p>
          </DashboardCard>
        ))}
      </div>

      {/* Settings */}
      <DashboardCard className="mt-6 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-header)]">Auto-apply</p>
            <p className="text-xs text-[var(--brand-header)]/55 mt-0.5">
              Applies to Greenhouse &amp; Lever jobs daily
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
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

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="app-label">Minimum match score</label>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="flex-1"
              />
              <span className="w-12 text-right text-sm font-semibold text-[var(--brand-header)]">
                {minScore}%
              </span>
            </div>
            <p className="text-xs text-[var(--brand-header)]/40 mt-1">
              Only apply to jobs with this match score or higher
            </p>
          </div>
          <div>
            <label className="app-label">Daily limit</label>
            <input
              type="number"
              className="app-input mt-1"
              min={1}
              max={50}
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Math.max(1, Math.min(50, Number(e.target.value))))}
            />
            <p className="text-xs text-[var(--brand-header)]/40 mt-1">
              Max applications per day (1–50)
            </p>
          </div>
        </div>

        <div>
          <label className="app-label">Cover letter / additional comments (optional)</label>
          <textarea
            className="app-input mt-1 min-h-[8rem] resize-y"
            placeholder="Write a short cover letter or note that will be included with every auto-application…"
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 border-t border-[var(--border)] pt-4">
          <div className="flex-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> Auto-apply works on Greenhouse and Lever jobs only. Workday,
              LinkedIn, and other platforms require the extension. Make sure your profile has a
              resume uploaded before enabling.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void saveSettings()}
            disabled={saving}
            className="app-btn-primary shrink-0"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </DashboardCard>

      {/* Queue */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-[var(--brand-header)]">
            Application queue
          </p>
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
          <DashboardEmpty message="No jobs in the queue yet. Enable auto-apply and click 'Run now' to queue jobs from your feed." />
        ) : (
          <div className="space-y-3">
            {/* Applied today */}
            {appliedJobs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-header)]/45 mb-2">
                  Applied ({appliedJobs.length})
                </p>
                <div className="space-y-2">
                  {appliedJobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}

            {/* Pending */}
            {pendingJobs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-header)]/45 mb-2">
                  Pending ({pendingJobs.length})
                </p>
                <div className="space-y-2">
                  {pendingJobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}

            {/* Failed */}
            {failedJobs.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-red-400 mb-2">
                  Failed ({failedJobs.length})
                </p>
                <div className="space-y-2">
                  {failedJobs.map((job) => (
                    <JobRow key={job.id} job={job} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function JobRow({ job }: { job: QueueJob }) {
  return (
    <DashboardCard className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                STATUS_COLORS[job.status] || STATUS_COLORS.pending
              }`}
            >
              {job.status}
            </span>
            {job.atsType && (
              <span className="rounded-full bg-[var(--brand-tag-bg)] px-2 py-0.5 text-xs text-[var(--brand-tag-text)] capitalize">
                {job.atsType}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-sm font-semibold text-[var(--brand-header)]">
            {job.title}
          </p>
          <p className="text-xs text-[var(--brand-header)]/65">{job.company}</p>
          {job.appliedAt && (
            <p className="mt-0.5 text-xs text-[var(--brand-header)]/40">
              Applied{" "}
              {new Date(job.appliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
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
          className="shrink-0 text-[var(--brand-header)]/40 hover:text-[var(--brand-header)]"
          aria-label="View job"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
    </DashboardCard>
  );
}
