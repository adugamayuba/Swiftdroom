"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, RefreshCw, CheckCircle2, Clock, XCircle, SkipForward, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

interface AutoApplySettings {
  enabled: boolean;
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
  verify:   { label: "Verify email", color: "bg-blue-100 text-blue-700",   icon: Mail },
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
  const [appliedThisMonth, setAppliedThisMonth] = useState(0);
  const [monthlyLimit, setMonthlyLimit] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [enabled, setEnabled] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [swiftdroomEmail, setSwiftdroomEmail] = useState<string | null>(null);

  // Security code state — keyed by job ID
  const [securityCodes, setSecurityCodes] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    const [settingsRes, queueRes, inboxRes] = await Promise.all([
      apiFetch("/api/auto-apply/settings"),
      apiFetch("/api/auto-apply/queue"),
      apiFetch("/api/inbox?limit=1"),
    ]);
    if (settingsRes.ok) {
      const data = await settingsRes.json();
      setSettings(data.settings);
      setAppliedToday(data.appliedToday);
      setTotalPending(data.totalPending);
      setAppliedThisMonth(data.appliedThisMonth ?? 0);
      setMonthlyLimit(data.monthlyLimit ?? 0);
      setEnabled(data.settings.enabled);
      setCoverLetter(data.settings.coverLetter || "");
    }
    if (queueRes.ok) {
      const data = await queueRes.json();
      setJobs(data.jobs || []);
    }
    if (inboxRes.ok) {
      const data = await inboxRes.json();
      setSwiftdroomEmail(data.alias ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  async function saveSettings() {
    setSaving(true);
    await apiFetch("/api/auto-apply/settings", {
      method: "PUT",
      body: JSON.stringify({ enabled, coverLetter }),
    });
    await loadData();
    setSaving(false);
  }

  async function verifyCode(jobId: string) {
    const code = securityCodes[jobId]?.trim();
    if (!code) return;
    setVerifying((v) => ({ ...v, [jobId]: true }));
    const res = await apiFetch("/api/auto-apply/verify-code", {
      method: "POST",
      body: JSON.stringify({ jobId, securityCode: code }),
    });
    setVerifying((v) => ({ ...v, [jobId]: false }));
    if (res.ok) {
      await loadData();
    } else {
      const data = await res.json().catch(() => ({})) as { error?: string };
      alert(data.error || "Verification failed — the code may be incorrect or expired.");
    }
  }

  if (loading) return <DashboardSpinner />;

  const appliedJobs  = jobs.filter((j) => j.status === "applied");
  const pendingJobs  = jobs.filter((j) => j.status === "pending");
  const verifyJobs   = jobs.filter((j) => j.status === "failed" && j.error === "security_code_required");
  const failedJobs   = jobs.filter((j) => j.status === "failed" && j.error !== "security_code_required");

  return (
    <div className="max-w-3xl pb-4">
      {/* Header */}
      <DashboardPageHeader
        title="Auto Apply"
        subtitle="Swiftdroom finds matching jobs and submits applications for you automatically"
      />

      {/* Swiftdroom email alias banner */}
      {swiftdroomEmail && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-[var(--brand-mint)]/40 border border-[var(--brand-mint)] px-4 py-3">
          <Mail className="h-4 w-4 text-[var(--brand-header)]/60 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-xs text-[var(--brand-header)]/60">Applications submitted as </span>
            <span className="text-xs font-semibold text-[var(--brand-header)] font-mono">{swiftdroomEmail}</span>
            <span className="text-xs text-[var(--brand-header)]/60"> — verification codes handled automatically</span>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {[
          { label: "Applied today",   value: String(appliedToday) },
          { label: "In queue",        value: String(totalPending) },
          {
            label: "This month",
            value: monthlyLimit > 0 ? `${appliedThisMonth}/${monthlyLimit}` : String(appliedThisMonth),
          },
          { label: "All time",        value: String(settings?.totalApplied ?? 0) },
        ].map(({ label, value }) => (
          <DashboardCard key={label} className="p-4 text-center">
            <p className="text-2xl font-semibold tabular-nums text-[var(--brand-header)]">{value}</p>
            <p className="mt-1 text-xs text-[var(--brand-header)]/45">{label}</p>
          </DashboardCard>
        ))}
      </div>

      {/* Monthly quota progress bar */}
      {monthlyLimit > 0 && (
        <div className="mt-3 px-1">
          <div className="flex justify-between text-xs text-neutral-500 mb-1">
            <span>{appliedThisMonth} applications used this billing period</span>
            <span>{Math.max(0, monthlyLimit - appliedThisMonth)} remaining</span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--brand-lavender)] transition-all"
              style={{ width: `${Math.min(100, Math.round((appliedThisMonth / monthlyLimit) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Settings card */}
      <DashboardCard className="mt-6 divide-y divide-[var(--border)]">
        {/* Toggle */}
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-header)]">Auto Apply</p>
            <p className="mt-0.5 text-xs text-[var(--brand-header)]/55">
              Finds and submits matching Greenhouse &amp; Lever jobs automatically
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
            {enabled
              ? "Swiftdroom is scanning for matching jobs. Applications will appear here shortly."
              : "Enable Auto Apply above to start. Swiftdroom will find and submit jobs for you automatically."}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Verify section — always shown first if any jobs need it */}
            {verifyJobs.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Verify email ({verifyJobs.length})
                </p>
                <div className="space-y-2">
                  {verifyJobs.map((job) => (
                    <DashboardCard key={job.id} className="border-blue-200 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge status="verify" />
                            <span className="rounded-full bg-[var(--brand-tag-bg)] px-2 py-0.5 text-xs capitalize text-[var(--brand-tag-text)]">
                              {job.atsType}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm font-semibold text-[var(--brand-header)]">{job.title}</p>
                          <p className="text-xs text-[var(--brand-header)]/55">{job.company}</p>
                          <p className="mt-1.5 text-xs text-blue-600">
                            Check your email for a verification code from Greenhouse and enter it below to complete this application.
                          </p>
                          <div className="mt-2 flex gap-2">
                            <input
                              type="text"
                              placeholder="Enter code from email"
                              className="app-input w-48 text-sm"
                              value={securityCodes[job.id] ?? ""}
                              onChange={(e) => setSecurityCodes((s) => ({ ...s, [job.id]: e.target.value }))}
                              onKeyDown={(e) => { if (e.key === "Enter") void verifyCode(job.id); }}
                            />
                            <button
                              type="button"
                              onClick={() => void verifyCode(job.id)}
                              disabled={verifying[job.id] || !securityCodes[job.id]?.trim()}
                              className="app-btn-primary text-xs"
                            >
                              {verifying[job.id] ? "Verifying…" : "Submit"}
                            </button>
                          </div>
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
            )}

            {/* Standard groups */}
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
                            <p className="mt-1 text-xs text-red-500">
                              {"Submission failed. Will retry automatically."}
                            </p>
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
