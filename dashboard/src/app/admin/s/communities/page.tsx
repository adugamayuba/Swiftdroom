"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearAdminToken } from "@/lib/api-client";

interface Invite {
  id: string;
  email: string;
  communityName: string;
  expiresAt: string;
  createdAt: string;
}

interface CommunityRow {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  leader: { email: string; name: string | null; referralCode: string };
}

export default function AdminCommunitiesPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [communities, setCommunities] = useState<CommunityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await apiFetch("/api/admin/s/communities");
    if (res.status === 401) {
      clearAdminToken();
      router.replace("/admin/s/login?return=/admin/s/communities");
      return;
    }
    const data = await res.json();
    setInvites(data.invites ?? []);
    setCommunities(data.communities ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    setError("");

    const res = await apiFetch("/api/admin/s/communities", {
      method: "POST",
      body: JSON.stringify({ email, communityName: communityName.trim() || undefined }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      if (res.status === 401) {
        clearAdminToken();
        router.replace("/admin/s/login?return=/admin/s/communities");
        return;
      }
      setError(data.error || "Failed to send invite.");
      return;
    }

    setEmail("");
    setCommunityName("");
    setMessage(`Invite sent to ${data.invite.email}.`);
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-neutral-900">Community leaders</h1>
      <p className="mt-1 text-neutral-500">
        Invite community leaders by email. They receive a link to set up their account and
        community dashboard.
      </p>

      <form
        onSubmit={handleInvite}
        className="mt-8 max-w-xl rounded-lg border border-neutral-200 bg-white p-6"
      >
        <h2 className="font-medium text-neutral-900">Send invite</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm text-neutral-600">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="leader@community.com"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-600">
              Community name <span className="text-neutral-400">(optional)</span>
            </label>
            <input
              value={communityName}
              onChange={(e) => setCommunityName(e.target.value)}
              className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="e.g. DevRel Africa"
            />
          </div>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send community invite"}
        </button>
      </form>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-medium text-neutral-900">Pending invites</h2>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-neutral-500">Loading...</p>
          ) : invites.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">No pending invites.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {invites.map((inv) => (
                <li key={inv.id} className="px-5 py-3 text-sm">
                  <p className="font-medium text-neutral-900">{inv.email}</p>
                  {inv.communityName && (
                    <p className="text-neutral-600">{inv.communityName}</p>
                  )}
                  <p className="mt-1 text-xs text-neutral-400">
                    Expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white">
          <div className="border-b border-neutral-200 px-5 py-4">
            <h2 className="font-medium text-neutral-900">Active communities</h2>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-neutral-500">Loading...</p>
          ) : communities.length === 0 ? (
            <p className="p-5 text-sm text-neutral-500">No communities yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {communities.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                  {c.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 font-semibold text-neutral-600">
                      {c.name.slice(0, 1)}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-neutral-900">{c.name}</p>
                    <p className="text-xs text-neutral-500">
                      {c.leader.email} · {c.slug} · {c.leader.referralCode}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
