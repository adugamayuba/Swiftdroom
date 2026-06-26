"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";

export default function CommunityAccountPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setEmail(data.email);
        setName(data.name);
      });
  }, []);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-semibold text-[var(--brand-header)]">Account</h1>
      <p className="mt-1 text-sm text-[var(--brand-header)]/60">
        Sign-in details for your community leader account.
      </p>

      <div className="mt-8 app-card space-y-4 p-6 text-sm">
        <div>
          <p className="text-[var(--brand-header)]/50">Name</p>
          <p className="mt-0.5 font-medium text-[var(--brand-header)]">{name || "—"}</p>
        </div>
        <div>
          <p className="text-[var(--brand-header)]/50">Email</p>
          <p className="mt-0.5 font-medium text-[var(--brand-header)]">{email || "—"}</p>
        </div>
        <div className="border-t border-[var(--brand-header)]/10 pt-4">
          <Link href="/forgot-password" className="text-[var(--brand-lavender)] hover:underline">
            Reset password
          </Link>
        </div>
      </div>
    </div>
  );
}
