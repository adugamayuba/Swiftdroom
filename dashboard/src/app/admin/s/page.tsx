"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

interface ReferralSummary {
  pending: { count: number; amount: number };
  eligible: { count: number; amount: number };
  paid: { count: number; amount: number };
  canceled: { count: number; amount: number };
}

type TriggerAction = "worker" | "ingest" | "poll" | "all";

export default function AdminSOverviewPage() {
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [triggering, setTriggering] = useState<TriggerAction | null>(null);
  const [triggerResult, setTriggerResult] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/admin/s/referrals")
      .then((r) => r.json())
      .then((data) => setSummary(data.summary));
  }, []);

  async function trigger(action: TriggerAction) {
    setTriggering(action);
    setTriggerResult(null);
    try {
      const res = await apiFetch("/api/admin/s/trigger-worker", {
        method: "POST",
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      setTriggerResult(JSON.stringify(data.results, null, 2));
    } catch (err) {
      setTriggerResult(String(err));
    }
    setTriggering(null);
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Admin overview</h1>
      <p className="mt-1 text-neutral-500">
        Manage referral payouts and monitor subscription health.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summary &&
          (
            [
              { label: "Pending commissions", data: summary.pending },
              { label: "Ready for payout", data: summary.eligible },
              { label: "Paid out", data: summary.paid },
              { label: "Canceled", data: summary.canceled },
            ] as const
          ).map(({ label, data }) => (
            <div
              key={label}
              className="rounded-lg border border-neutral-200 bg-white p-5"
            >
              <p className="text-sm text-neutral-500">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-neutral-900">
                ${data.amount.toFixed(2)}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {data.count} referral{data.count === 1 ? "" : "s"}
              </p>
            </div>
          ))}
      </div>

      {/* Auto-apply controls */}
      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-neutral-900">Auto-apply controls</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Manually trigger the worker, job ingest, or email poller for all users without waiting for the cron.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              { action: "worker" as const, label: "Run worker (all users)" },
              { action: "ingest" as const, label: "Ingest jobs" },
              { action: "poll"   as const, label: "Poll inbox emails" },
              { action: "all"    as const, label: "Run all" },
            ] as const
          ).map(({ action, label }) => (
            <button
              key={action}
              onClick={() => trigger(action)}
              disabled={triggering !== null}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50"
            >
              {triggering === action ? "Running…" : label}
            </button>
          ))}
        </div>
        {triggerResult && (
          <pre className="mt-4 rounded-lg bg-neutral-50 border border-neutral-200 p-4 text-xs text-neutral-700 overflow-x-auto max-h-64">
            {triggerResult}
          </pre>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-neutral-200 bg-white p-6">
        <h2 className="font-medium text-neutral-900">Monthly payout workflow</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-neutral-600">
          <li>On the 3rd of each month, open Referral payouts.</li>
          <li>
            Click &quot;Process eligible&quot; to move 30-day-old commissions to
            eligible and send redemption emails.
          </li>
          <li>
            Collect payment details from referrers who reply, then mark each as
            Paid with a note.
          </li>
        </ol>
        <Link
          href="/admin/s/referrals"
          className="mt-6 inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Manage referral payouts
        </Link>
        <Link
          href="/admin/s/communities"
          className="mt-3 inline-block rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
        >
          Invite community leaders
        </Link>
      </div>
    </div>
  );
}
