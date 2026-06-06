"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Copy, Check, Gift } from "lucide-react";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  config: {
    holdDays: number;
    referrerCommissionPercent: number;
    refereeDiscountPercent: number;
  };
  referrals: {
    id: string;
    name: string;
    email: string;
    plan: string;
    subscribed: boolean;
    joinedAt: string;
  }[];
  earnings: {
    id: string;
    referredEmail: string;
    referredName: string | null;
    plan: string;
    commissionAmount: number;
    status: string;
    eligibleAt: string;
    paidAt: string | null;
    createdAt: string;
  }[];
  totals: {
    pending: number;
    eligible: number;
    paid: number;
    canceled: number;
  };
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    apiFetch("/api/referrals")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function copyText(text: string, type: "code" | "link") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!data) {
    return <p className="text-neutral-500">Loading referrals...</p>;
  }

  const statusColor: Record<string, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    ELIGIBLE: "bg-blue-100 text-blue-800",
    PAID: "bg-green-100 text-green-800",
    CANCELED: "bg-neutral-100 text-neutral-600",
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[var(--brand-header)]">Referrals</h1>
      <p className="mt-1 text-[var(--brand-header)]/60">
        Invite friends and earn {data.config.referrerCommissionPercent}% of their first
        subscription. They get {data.config.refereeDiscountPercent}% off their first month.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="app-card p-6">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-[var(--brand-lavender)]" />
            <h2 className="font-medium text-[var(--brand-header)]">Your invite link</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--brand-header)]/55">
            Share this link. When someone signs up and subscribes, you earn a one-time
            commission after {data.config.holdDays} days.
          </p>

          <div className="mt-4 flex items-center gap-2">
            <code className="rounded-md bg-[var(--brand-mint)]/40 px-3 py-2 text-sm font-mono">
              {data.referralCode}
            </code>
            <button
              type="button"
              onClick={() => copyText(data.referralCode, "code")}
              className="rounded-md border border-[var(--brand-header)]/15 p-2 hover:bg-[var(--brand-mint)]/30"
            >
              {copied === "code" ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>

          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={data.referralLink}
              className="app-input flex-1 text-sm"
            />
            <button
              type="button"
              onClick={() => copyText(data.referralLink, "link")}
              className="app-btn-primary shrink-0 px-4"
            >
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="app-card p-6">
          <h2 className="font-medium text-[var(--brand-header)]">Earnings summary</h2>
          <dl className="mt-4 space-y-3">
            {[
              ["Pending (30-day hold)", data.totals.pending],
              ["Ready for payout", data.totals.eligible],
              ["Paid out", data.totals.paid],
            ].map(([label, amount]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <dt className="text-[var(--brand-header)]/60">{label}</dt>
                <dd className="font-semibold text-[var(--brand-header)]">
                  ${(amount as number).toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-[var(--brand-header)]/45">
            Payouts are processed on the 3rd of each month. After {data.config.holdDays}{" "}
            days you will receive an email with redemption instructions.
          </p>
        </div>
      </div>

      <div className="mt-8 app-card overflow-hidden">
        <div className="border-b border-[var(--brand-header)]/10 px-6 py-4">
          <h2 className="font-medium text-[var(--brand-header)]">People you referred</h2>
        </div>
        {data.referrals.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--brand-header)]/50">
            No referrals yet. Share your link to get started.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-header)]/10 text-left text-[var(--brand-header)]/50">
                <th className="px-6 py-3 font-medium">User</th>
                <th className="px-6 py-3 font-medium">Joined</th>
                <th className="px-6 py-3 font-medium">Subscribed</th>
              </tr>
            </thead>
            <tbody>
              {data.referrals.map((r) => (
                <tr key={r.id} className="border-b border-[var(--brand-header)]/5">
                  <td className="px-6 py-3">
                    <p className="font-medium text-[var(--brand-header)]">{r.name}</p>
                    <p className="text-xs text-[var(--brand-header)]/45">{r.email}</p>
                  </td>
                  <td className="px-6 py-3 text-[var(--brand-header)]/60">
                    {new Date(r.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        r.subscribed
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-100 text-neutral-600"
                      }`}
                    >
                      {r.subscribed ? r.plan.toLowerCase() : "Not yet"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-8 app-card overflow-hidden">
        <div className="border-b border-[var(--brand-header)]/10 px-6 py-4">
          <h2 className="font-medium text-[var(--brand-header)]">Commission history</h2>
        </div>
        {data.earnings.length === 0 ? (
          <p className="px-6 py-8 text-sm text-[var(--brand-header)]/50">
            Commissions appear here when a referred user completes their first payment.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-header)]/10 text-left text-[var(--brand-header)]/50">
                <th className="px-6 py-3 font-medium">Referred user</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Eligible</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.earnings.map((e) => (
                <tr key={e.id} className="border-b border-[var(--brand-header)]/5">
                  <td className="px-6 py-3">
                    <p className="text-[var(--brand-header)]">{e.referredEmail}</p>
                    <p className="text-xs capitalize text-[var(--brand-header)]/45">
                      {e.plan.toLowerCase()} plan
                    </p>
                  </td>
                  <td className="px-6 py-3 font-medium text-[var(--brand-header)]">
                    ${e.commissionAmount.toFixed(2)}
                  </td>
                  <td className="px-6 py-3 text-[var(--brand-header)]/60">
                    {new Date(e.eligibleAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                        statusColor[e.status] || "bg-neutral-100"
                      }`}
                    >
                      {e.status.toLowerCase()}
                    </span>
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
