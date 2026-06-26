"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { apiFetch, setSessionToken } from "@/lib/api-client";
import { broadcastAuthChange } from "@/lib/auth-session";
import { persistApiToken } from "@/lib/extension-client";
import { USER_MESSAGES, friendlyUserMessage } from "@/lib/user-messages";

function CommunityRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [inviteLoading, setInviteLoading] = useState(true);
  const [inviteError, setInviteError] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setInviteError("Missing invite link. Check the email from Swiftdroom.");
      setInviteLoading(false);
      return;
    }

    apiFetch(`/api/auth/community-invite?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setInviteError(data.error || "Invalid invite.");
          return;
        }
        setEmail(data.email);
        if (data.communityName) {
          setCommunityName(data.communityName);
          setName(data.communityName);
        }
      })
      .catch(() => setInviteError(USER_MESSAGES.network))
      .finally(() => setInviteLoading(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await apiFetch("/api/auth/register/community", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, token }),
    });

    let data: {
      error?: string;
      apiToken?: string;
      sessionToken?: string;
      redirectTo?: string;
    } = {};
    try {
      data = await res.json();
    } catch {
      setError(USER_MESSAGES.network);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (!res.ok) {
      setError(friendlyUserMessage(data.error, "We couldn't create your account."));
      return;
    }

    if (data.sessionToken) setSessionToken(data.sessionToken);
    if (data.apiToken) persistApiToken(data.apiToken);
    broadcastAuthChange(true);
    router.replace(data.redirectTo || "/community");
  }

  if (inviteLoading) {
    return (
      <AuthLayout>
        <div className="app-card p-8 text-center text-sm text-[var(--brand-header)]/55">
          Verifying your invite...
        </div>
      </AuthLayout>
    );
  }

  if (inviteError) {
    return (
      <AuthLayout>
        <div className="app-card p-8 text-center">
          <p className="text-sm text-red-600">{inviteError}</p>
          <Link href="/login" className="mt-4 inline-block text-sm text-[var(--brand-lavender)]">
            Sign in instead
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="app-card p-8">
        <h1 className="text-xl font-semibold text-[var(--brand-header)]">
          Set up your community
        </h1>
        <p className="mt-2 text-sm text-[var(--brand-header)]/60">
          {communityName
            ? `You're joining Swiftdroom as the leader of ${communityName}.`
            : "Create your password to access your community dashboard."}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--brand-header)]">
              Your name
            </label>
            <input
              className="app-input mt-1.5 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Leader name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--brand-header)]">
              Email
            </label>
            <input
              className="app-input mt-1.5 w-full bg-neutral-50"
              type="email"
              value={email}
              readOnly
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--brand-header)]">
              Password
            </label>
            <input
              className="app-input mt-1.5 w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading} className="app-btn-primary w-full py-2.5">
            {loading ? "Creating account..." : "Create community account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[var(--brand-header)]/45">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--brand-lavender)] hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default function CommunityRegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <div className="app-card p-8 text-center text-sm text-[var(--brand-header)]/55">
            Loading...
          </div>
        </AuthLayout>
      }
    >
      <CommunityRegisterForm />
    </Suspense>
  );
}
