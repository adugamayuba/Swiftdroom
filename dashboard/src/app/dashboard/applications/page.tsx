"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Trash2 } from "lucide-react";

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
  applied: "bg-blue-100 text-blue-700",
  screening: "bg-purple-100 text-purple-700",
  interview: "bg-amber-100 text-amber-700",
  offer: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  withdrawn: "bg-slate-100 text-slate-600",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  function loadApplications() {
    fetch("/api/applications")
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
    await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    loadApplications();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this application?")) return;
    await fetch(`/api/applications/${id}`, { method: "DELETE" });
    loadApplications();
  }

  if (loading) return <p className="text-slate-500">Loading applications...</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
      <p className="mt-1 text-slate-500">
        Track where you&apos;ve applied — logged automatically by the extension
      </p>

      {applications.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 p-12 text-center">
          <p className="text-slate-500">
            No applications tracked yet. When you use the extension to fill a
            form, applications are logged here automatically.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Company</th>
                <th className="px-4 py-3 font-medium text-slate-600">Role</th>
                <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 font-medium text-slate-600">Applied</th>
                <th className="px-4 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {app.company}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{app.role}</td>
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
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(app.appliedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
