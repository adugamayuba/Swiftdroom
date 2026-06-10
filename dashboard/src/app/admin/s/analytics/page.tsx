"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

type AnalyticsSummary = {
  days: number;
  sessions: number;
  avgDurationSec: number;
  avgPageViews: number;
  registrations: number;
  conversionRate: number;
  promoShown: number;
  promoClicked: number;
  registerClicks: number;
  topPages: Array<{ path: string; count: number }>;
  topClicks: Array<{ label: string; count: number }>;
  topSources: Array<{ source: string; count: number }>;
  recentSessions: Array<{
    startedAt: string;
    durationSec: number;
    pageViews: number;
    source: string;
    medium: string;
    landing: string;
  }>;
};

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/admin/s/analytics?days=${days}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Site analytics</h1>
          <p className="mt-1 text-neutral-500">
            Sessions, time on site, clicks, and traffic sources (first-party tracking).
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {loading && (
        <p className="mt-8 text-sm text-neutral-500">Loading analytics…</p>
      )}

      {data && !loading && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Sessions", value: String(data.sessions) },
              { label: "Avg time on site", value: fmtDuration(data.avgDurationSec) },
              { label: "Registrations", value: String(data.registrations) },
              {
                label: "Session → signup",
                value: `${data.conversionRate}%`,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-neutral-200 bg-white p-5"
              >
                <p className="text-sm text-neutral-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Avg pages / session", value: String(data.avgPageViews) },
              { label: "Promo popup shown", value: String(data.promoShown) },
              { label: "Promo → register clicks", value: String(data.promoClicked) },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-lg border border-neutral-200 bg-white p-4"
              >
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="mt-1 text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="font-medium text-neutral-900">Traffic sources (UTM)</h2>
              <p className="mt-1 text-xs text-neutral-400">
                tiktok / meta / direct — check if ad traffic dropped when campaigns pause.
              </p>
              {data.topSources.length === 0 ? (
                <p className="mt-4 text-sm text-neutral-500">No sessions yet.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {data.topSources.map(({ source, count }) => (
                    <li
                      key={source}
                      className="flex justify-between text-sm"
                    >
                      <span className="font-medium text-neutral-800">{source}</span>
                      <span className="text-neutral-500">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6">
              <h2 className="font-medium text-neutral-900">Top pages</h2>
              <ul className="mt-4 space-y-2">
                {data.topPages.map(({ path, count }) => (
                  <li key={path} className="flex justify-between text-sm">
                    <span className="truncate text-neutral-800">{path}</span>
                    <span className="ml-2 shrink-0 text-neutral-500">{count}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-lg border border-neutral-200 bg-white p-6 lg:col-span-2">
              <h2 className="font-medium text-neutral-900">Top clicks</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {data.topClicks.map(({ label, count }) => (
                  <li
                    key={label}
                    className="flex justify-between rounded bg-neutral-50 px-3 py-2 text-sm"
                  >
                    <span className="truncate text-neutral-700">{label}</span>
                    <span className="ml-2 shrink-0 text-neutral-500">{count}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
            <h2 className="font-medium text-neutral-900">Recent sessions</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-neutral-500">
                    <th className="pb-2 pr-4">When</th>
                    <th className="pb-2 pr-4">Source</th>
                    <th className="pb-2 pr-4">Landing</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2">Pages</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSessions.map((s, i) => (
                    <tr key={i} className="border-b border-neutral-100">
                      <td className="py-2 pr-4 text-neutral-600">
                        {new Date(s.startedAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-4">
                        {s.source}
                        {s.medium ? ` / ${s.medium}` : ""}
                      </td>
                      <td className="py-2 pr-4">{s.landing}</td>
                      <td className="py-2 pr-4">{fmtDuration(s.durationSec)}</td>
                      <td className="py-2">{s.pageViews}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <p className="mt-6 text-xs text-neutral-400">
            Vercel Analytics (in your Vercel dashboard) still shows aggregate visits.
            This page is first-party detail: clicks, scroll, promo funnel, and UTM breakdown.
            Ad links should include{" "}
            <code className="rounded bg-neutral-100 px-1">utm_source=tiktok</code> or{" "}
            <code className="rounded bg-neutral-100 px-1">utm_source=meta</code> to
            attribute traffic here.
          </p>
        </>
      )}
    </div>
  );
}
