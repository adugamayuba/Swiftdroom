"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import {
  DashboardCard,
  DashboardEmpty,
  DashboardPageHeader,
  DashboardSpinner,
} from "@/components/dashboard/ui";

interface Application {
  id: string;
  company: string;
  role: string;
  url: string;
  status: string;
  appliedAt: string;
  notes: string;
}

const STATUS_OPTIONS = [
  "applied",
  "screening",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
];

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-[var(--brand-tag-bg)] text-[var(--brand-tag-text)]",
  screening: "bg-purple-100 text-purple-800",
  interview: "bg-amber-100 text-amber-800",
  offer: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-neutral-100 text-neutral-600",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="max-w-4xl">
      <DashboardPageHeader
        title="Applications"
        subtitle="Track where you've applied — logged automatically by the extension"
      />

      {applications.length === 0 ? (
        <DashboardEmpty
          className="mt-12"
          message="No applications tracked yet. When you use the extension to fill a form, applications are logged here automatically."
        />
      ) : (
        <DashboardCard className="mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--brand-mint)]/40">
              <tr>
                <th className="px-4 py-3 font-medium text-[var(--brand-header)]/65">Company</th>
                <th className="px-4 py-3 font-medium text-[var(--brand-header)]/65">Role</th>
                <th className="px-4 py-3 font-medium text-[var(--brand-header)]/65">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--brand-header)]/65">Applied</th>
                <th className="px-4 py-3 font-medium text-[var(--brand-header)]/65"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--brand-header)]">
                    {app.company}
                  </td>
                  <td className="px-4 py-3 text-[var(--brand-header)]/65">{app.role}</td>
                  <td className="px-4 py-3">
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus(app.id, e.target.value)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-medium capitalize ${STATUS_COLORS[app.status] || STATUS_COLORS.applied}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-[var(--brand-header)]/55">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>
      )}
    </div>
  );
}
