"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardEmpty,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

interface SubmittedAnswer {
  label: string;
  value: string;
  draftValue?: string;
  source?: string;
  isOpenEnded?: boolean;
}

interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  status: string;
  appliedAt: string;
  notes: string;
  fieldsFilled?: number;
  fieldsAttempted?: number;
  submittedAnswers?: SubmittedAnswer[] | null;
}

const STATUS_OPTIONS = [
  { value: "filled", label: "Autofilled" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "invited", label: "Invited" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "hired", label: "Hired" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

const STATUS_COLORS: Record<string, string> = {
  filled: "bg-sky-100 text-sky-800",
  applied: "bg-[var(--brand-tag-bg)] text-[var(--brand-tag-text)]",
  screening: "bg-purple-100 text-purple-800",
  invited: "bg-indigo-100 text-indigo-800",
  interview: "bg-amber-100 text-amber-800",
  offer: "bg-emerald-100 text-emerald-800",
  hired: "bg-green-100 text-green-900",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-neutral-100 text-neutral-600",
};

function statusLabel(status: string) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function loadApplications() {
    apiFetch("/api/applications")
      .then((r) => r.json())
      .then((data) => {
        setApplications(data.applications || []);
        setLoading(false);
      });
  }

  useEffect(() => {
    loadApplications();
  }, []);

  async function updateStatus(id: string, status: string) {
    await apiFetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadApplications();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this application?")) return;
    await apiFetch(`/api/applications/${id}`, { method: "DELETE" });
    loadApplications();
  }

  if (loading) return <DashboardSpinner />;

  const statusCounts = STATUS_OPTIONS.map((s) => ({
    ...s,
    count: applications.filter((a) => a.status === s.value).length,
  })).filter((s) => s.count > 0);

  return (
    <div className="max-w-4xl">
      <DashboardPageHeader
        title="Applications"
        subtitle="Track every job you apply to — answers are saved to improve your AI over time"
      />

      {statusCounts.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {statusCounts.map((s) => (
            <span
              key={s.value}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${STATUS_COLORS[s.value] || STATUS_COLORS.applied}`}
            >
              {s.label}: {s.count}
            </span>
          ))}
        </div>
      )}

      {applications.length === 0 ? (
        <DashboardEmpty
          className="mt-12"
          message="No applications tracked yet. Use the extension to fill a form — your answers and job details are saved here automatically."
        />
      ) : (
        <div className="mt-8 space-y-3">
          {applications.map((app) => {
            const expanded = expandedId === app.id;
            const answers = Array.isArray(app.submittedAnswers)
              ? app.submittedAnswers
              : [];
            const openAnswers = answers.filter((a) => a.isOpenEnded);
            const shortAnswers = answers.filter((a) => !a.isOpenEnded);

            return (
              <DashboardCard key={app.id} className="overflow-hidden">
                <div className="flex items-start gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : app.id)}
                    className="mt-1 text-[var(--brand-header)]/45 hover:text-[var(--brand-header)]"
                    aria-label={expanded ? "Collapse" : "Expand"}
                  >
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[var(--brand-header)]">
                          {app.company}
                        </p>
                        <p className="text-sm text-[var(--brand-header)]/65">{app.role}</p>
                        <p className="mt-1 text-xs text-[var(--brand-header)]/45">
                          {new Date(app.appliedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                          {app.fieldsFilled
                            ? ` · ${app.fieldsFilled} field${app.fieldsFilled === 1 ? "" : "s"} saved`
                            : ""}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <select
                          value={app.status}
                          onChange={(e) => updateStatus(app.id, e.target.value)}
                          className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[app.status] || STATUS_COLORS.applied}`}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[var(--brand-header)]/45 hover:text-[var(--brand-header)]"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDelete(app.id)}
                          className="text-[var(--brand-header)]/45 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="mt-4 space-y-4 border-t border-[var(--border)] pt-4">
                        {app.notes && (
                          <p className="text-xs text-[var(--brand-header)]/55">{app.notes}</p>
                        )}

                        {answers.length === 0 ? (
                          <p className="text-sm text-[var(--brand-header)]/55">
                            No saved answers for this application yet.
                          </p>
                        ) : (
                          <>
                            {openAnswers.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-header)]/45">
                                  Your written answers
                                </p>
                                <div className="mt-2 space-y-3">
                                  {openAnswers.map((a, i) => (
                                    <div
                                      key={`${a.label}-${i}`}
                                      className="rounded-md border border-[var(--border)] bg-[var(--brand-mint)]/20 p-3"
                                    >
                                      <p className="text-xs font-medium text-[var(--brand-header)]">
                                        {a.label}
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--brand-header)]/75">
                                        {a.value}
                                      </p>
                                      {a.draftValue && a.draftValue !== a.value && (
                                        <p className="mt-2 text-xs text-[var(--brand-header)]/45">
                                          Edited on page before submit
                                        </p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {shortAnswers.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--brand-header)]/45">
                                  Form fields
                                </p>
                                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                  {shortAnswers.map((a, i) => (
                                    <div
                                      key={`${a.label}-${i}`}
                                      className="rounded-md border border-[var(--border)] px-3 py-2"
                                    >
                                      <p className="text-xs text-[var(--brand-header)]/45">
                                        {a.label}
                                      </p>
                                      <p className="text-sm font-medium text-[var(--brand-header)]">
                                        {a.value}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        <p className="text-xs text-[var(--brand-header)]/45">
                          Saved answers help Swiftdroom match your voice on future applications.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </DashboardCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
