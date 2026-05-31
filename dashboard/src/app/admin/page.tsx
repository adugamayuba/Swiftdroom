"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface Stats {
  totalUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  activeSubscribers: number;
  conversionRate: number;
  mrr: number;
  arr: number;
  planBreakdown: { starter: number; pro: number; business: number };
  totalApplications: number;
  applicationsThisMonth: number;
  monthlySignups: { month: string; count: number }[];
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/stats")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  if (!stats) {
    return <p className="text-neutral-500">Loading metrics...</p>;
  }

  const cards = [
    { label: "Total users", value: stats.totalUsers.toLocaleString() },
    { label: "New users this month", value: stats.newUsersThisMonth.toLocaleString() },
    {
      label: "User growth rate",
      value: `${stats.userGrowthRate > 0 ? "+" : ""}${stats.userGrowthRate}%`,
    },
    { label: "Active subscribers", value: stats.activeSubscribers.toLocaleString() },
    { label: "Conversion rate", value: `${stats.conversionRate}%` },
    { label: "MRR", value: `$${stats.mrr.toLocaleString()}` },
    { label: "ARR", value: `$${stats.arr.toLocaleString()}` },
    {
      label: "Applications this month",
      value: stats.applicationsThisMonth.toLocaleString(),
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Overview</h1>
      <p className="mt-1 text-neutral-500">Company metrics and growth</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value }) => (
          <div
            key={label}
            className="rounded-lg border border-neutral-200 bg-white p-5"
          >
            <p className="text-sm text-neutral-500">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-medium text-neutral-900">Subscribers by plan</h2>
          <dl className="mt-4 space-y-3">
            {[
              ["Starter", stats.planBreakdown.starter],
              ["Pro", stats.planBreakdown.pro],
              ["Business", stats.planBreakdown.business],
            ].map(([plan, count]) => (
              <div key={plan as string} className="flex justify-between text-sm">
                <dt className="text-neutral-600">{plan}</dt>
                <dd className="font-medium text-neutral-900">{count as number}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-6">
          <h2 className="font-medium text-neutral-900">Monthly signups</h2>
          <div className="mt-4 space-y-2">
            {stats.monthlySignups.slice(0, 6).map(({ month, count }) => (
              <div key={month} className="flex items-center gap-3">
                <span className="w-16 text-xs text-neutral-500">{month}</span>
                <div className="flex-1">
                  <div
                    className="h-2 rounded bg-neutral-900"
                    style={{
                      width: `${Math.min(100, (count / Math.max(...stats.monthlySignups.map((m) => m.count), 1)) * 100)}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right text-xs font-medium text-neutral-700">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
