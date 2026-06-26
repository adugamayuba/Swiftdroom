"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Check, Gift, Users, ExternalLink } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface CommunityDashboardData {
  community: {
    name: string;
    slug: string;
    logoUrl: string;
    description: string;
    website: string;
  };
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
    commissionAmount: number;
    status: string;
    eligibleAt: string;
  }[];
  totals: {
    pending: number;
    eligible: number;
    paid: number;
  };
}

export default function CommunityDashboardPage() {
  const [data, setData] = useState<CommunityDashboardData | null>(null);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    apiFetch("/api/community")
      .then((r) => r.json())
      .then(setData);
  }, []);

  async function copyText(text: string, type: "code" | "link") {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  }

  if (!data) {
    return <p className="text-neutral-500">Loading your community dashboard...</p>;
  }

  const { community } = data;
  const profileIncomplete = !community.logoUrl || !community.description;

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          {community.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={community.logoUrl}
              alt=""
              className="h-16 w-16 rounded-xl border border-[var(--brand-header)]/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--brand-mint)] text-xl font-semibold text-[var(--brand-header)]">
              {community.name.slice(0, 1).toUpperCase() || "C"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold text-[var(--brand-header)]">
              {community.name || "Your community"}
            </h1>
            <p className="mt-1 text-sm text-[var(--brand-header)]/60">
              Community referral dashboard — share your link with members.
            </p>
          </div>
        </div>
        <Link href="/community/settings" className="app-btn-secondary shrink-0 px-4 py-2 text-sm">
          Edit community profile
        </Link>
      </div>

      {profileIncomplete && (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Complete your community profile (logo and description) so members recognize your page.{" "}
          <Link href="/community/settings" className="font-medium underline">
            Set up now
          </Link>
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <div className="app-card p-6 lg:col-span-2">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-[var(--brand-lavender)]" />
            <h2 className="font-medium text-[var(--brand-header)]">Community invite link</h2>
          </div>
          <p className="mt-2 text-sm text-[var(--brand-header)]/55">
            Share this with your community. Members get {data.config.refereeDiscountPercent}% off
            their first month. You earn {data.config.referrerCommissionPercent}% after{" "}
            {data.config.holdDays} days.
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
            <input readOnly value={data.referralLink} className="app-input flex-1 text-sm" />
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
          <h2 className="font-medium text-[var(--brand-header)]">Earnings</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ["Pending", data.totals.pending],
              ["Ready for payout", data.totals.eligible],
              ["Paid out", data.totals.paid],
            ].map(([label, amount]) => (
              <div key={label as string} className="flex justify-between">
                <dt className="text-[var(--brand-header)]/60">{label}</dt>
                <dd className="font-semibold text-[var(--brand-header)]">
                  ${(amount as number).toFixed(2)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="app-card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-[var(--brand-header)]/10 px-6 py-4">
            <Users className="h-4 w-4 text-[var(--brand-lavender)]" />
            <h2 className="font-medium text-[var(--brand-header)]">Members who joined</h2>
          </div>
          {data.referrals.length === 0 ? (
            <p className="px-6 py-8 text-sm text-[var(--brand-header)]/50">
              No members yet. Share your invite link to get started.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--brand-header)]/5">
              {data.referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-6 py-3 text-sm">
                  <div>
                    <p className="font-medium text-[var(--brand-header)]">{r.name}</p>
                    <p className="text-xs text-[var(--brand-header)]/45">{r.email}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      r.subscribed
                        ? "bg-green-100 text-green-800"
                        : "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {r.subscribed ? r.plan.toLowerCase() : "Signed up"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="app-card p-6">
          <h2 className="font-medium text-[var(--brand-header)]">Public community page</h2>
          <p className="mt-2 text-sm text-[var(--brand-header)]/55">
            Your community slug is used in referral links so members know who invited them.
          </p>
          <p className="mt-4 font-mono text-sm text-[var(--brand-header)]">
            swiftdroom.com/register?ref={data.referralCode}&community={community.slug}
          </p>
          {community.website && (
            <a
              href={community.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-1 text-sm text-[var(--brand-lavender)] hover:underline"
            >
              {community.website}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
