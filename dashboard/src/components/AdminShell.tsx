"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, clearSessionToken } from "@/lib/api-client";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    apiFetch("/api/me")
      .then(async (r) => {
        if (!r.ok) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.role !== "ADMIN") {
          router.replace("/dashboard");
          return;
        }
        setReady(true);
      });
  }, [router]);

  async function handleSignOut() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    clearSessionToken();
    router.push("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-100">
        <p className="text-neutral-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="text-lg font-semibold text-neutral-900">
              Swiftdroom Admin
            </Link>
            <nav className="flex gap-4 text-sm">
              <Link href="/admin" className="text-neutral-600 hover:text-neutral-900">
                Overview
              </Link>
              <Link href="/admin/users" className="text-neutral-600 hover:text-neutral-900">
                Users
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-neutral-500 hover:text-neutral-900">
              User dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-sm text-neutral-500 hover:text-neutral-900"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
