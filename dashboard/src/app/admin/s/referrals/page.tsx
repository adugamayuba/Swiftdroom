"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";

interface Earning {
  id: string;
  commissionAmount: number;
  status: string;
  eligibleAt: string;
  paidAt: string | null;
  paidNote: string;
  referrer: { email: string; name: string | null; referralCode: string };
  referredUser: { email: string; name: string | null; plan: string };
}

export default function AdminSReferralsPage() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [filter, setFilter] = useState<string>("ELIGIBLE");
  const [processing, setProcessing] = useState(false);
  const [noteEdits, setNoteEdits] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    const qs = filter ? `?status=${filter}` : "";
    apiFetch(`/api/admin/s/referrals${qs}`)
      .then((r) => r.json())
      .then((data) => setEarnings(data.earnings || []));
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function processEligible() {
    setProcessing(true);
    await apiFetch("/api/admin/s/referrals", {
      method: "POST",
      body: JSON.stringify({ action: "process_eligible" }),
    });
    setProcessing(false);
    load();
  }

  async function markPaid(id: string) {
    await apiFetch(`/api/admin/s/referrals/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: "PAID",
        paidNote: noteEdits[id] || "",
      }),
    });
    load();
  }

  const statusTabs = ["ELIGIBLE", "PENDING", "PAID", "CANCELED", ""];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Referral payouts</h1>
          <p className="mt-1 text-neutral-500">
            Process commissions on the 3rd of each month.
          </p>
        </div>
        <button
          type="button"
          onClick={processEligible}
          disabled={processing}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {processing ? "Processing..." : "Process eligible (send emails)"}
        </button>
      </div>

      <div className="mt-6 flex gap-2">
        {statusTabs.map((tab) => (
          <button
            key={tab || "all"}
            type="button"
            onClick={() => setFilter(tab)}
            className={`rounded-full px-3 py-1 text-sm ${
              filter === tab
                ? "bg-neutral-900 text-white"
                : "bg-white text-neutral-600 ring-1 ring-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {tab ? tab.toLowerCase() : "all"}
          </button>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {earnings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-neutral-500">No earnings in this view.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="px-4 py-3 font-medium">Referrer</th>
                <th className="px-4 py-3 font-medium">Referred</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Eligible</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {earnings.map((e) => (
                <tr key={e.id} className="border-b border-neutral-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-neutral-900">{e.referrer.email}</p>
                    <p className="text-xs text-neutral-400">{e.referrer.referralCode}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-neutral-700">{e.referredUser.email}</p>
                    <p className="text-xs capitalize text-neutral-400">
                      {e.referredUser.plan.toLowerCase()}
                    </p>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    ${e.commissionAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-neutral-600">
                    {new Date(e.eligibleAt).toLocaleDateString()}
                    {e.paidAt && (
                      <p className="text-xs text-green-600">
                        Paid {new Date(e.paidAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.status === "ELIGIBLE" && (
                      <div className="flex flex-col gap-2">
                        <input
                          placeholder="Payout note (PayPal, etc.)"
                          value={noteEdits[e.id] || e.paidNote}
                          onChange={(ev) =>
                            setNoteEdits((prev) => ({
                              ...prev,
                              [e.id]: ev.target.value,
                            }))
                          }
                          className="w-full rounded border border-neutral-200 px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => markPaid(e.id)}
                          className="rounded bg-green-700 px-2 py-1 text-xs font-medium text-white hover:bg-green-800"
                        >
                          Mark paid
                        </button>
                      </div>
                    )}
                    {e.status === "PAID" && e.paidNote && (
                      <p className="text-xs text-neutral-500">{e.paidNote}</p>
                    )}
                    {e.status === "PENDING" && (
                      <span className="text-xs text-amber-600">Waiting 30 days</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
