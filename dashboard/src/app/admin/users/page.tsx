"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  onboardingComplete: boolean;
  plan: string;
  subscriptionStatus: string;
  applicationsUsed: number;
  applicationsLimit: number;
  _count: { applications: number };
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  useEffect(() => {
    fetch(`/api/admin/users?page=${page}`)
      .then((r) => r.json())
      .then((data) => {
        setUsers(data.users || []);
        setPages(data.pagination?.pages || 1);
      });
  }, [page]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Users</h1>
      <p className="mt-1 text-neutral-500">All registered accounts</p>

      <div className="mt-8 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              <th className="px-4 py-3 font-medium text-neutral-600">Email</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Joined</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Onboarded</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Plan</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Status</th>
              <th className="px-4 py-3 font-medium text-neutral-600">Usage</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-neutral-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900">{user.email}</div>
                  {user.name && (
                    <div className="text-xs text-neutral-500">{user.name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs ${user.onboardingComplete ? "text-green-700" : "text-neutral-400"}`}
                  >
                    {user.onboardingComplete ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 capitalize text-neutral-600">
                  {user.plan.toLowerCase()}
                </td>
                <td className="px-4 py-3 capitalize text-neutral-600">
                  {user.subscriptionStatus.toLowerCase()}
                </td>
                <td className="px-4 py-3 text-neutral-600">
                  {user.applicationsUsed}/{user.applicationsLimit || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm text-neutral-500">
            Page {page} of {pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
            className="rounded border border-neutral-300 px-3 py-1 text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
